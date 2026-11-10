"""Бэктест подбора коллегий (гипотеза H-05, спринт 3).

Для каждого исторического поединка с расстановкой по коллегиям:
  пул кандидатов = судьи, присутствовавшие на соседних поединках (предыдущий, текущий, следующий
  в той же таблице), — приближение «кто был доступен в этот момент»;
  наш алгоритм (backend.judging.collegia.propose_panel) собирает состав того же размера;
  сравниваем средний экспертный балл судьи в назначенной коллегии с фактической ручной расстановкой.

Запуск: python data/backtest_collegia.py data/private/<таблица заказчика>.xlsx
Таблица заказчика в git не хранится (см. data/README.md).
"""
from __future__ import annotations

import glob
import re
import statistics as st
import sys
import time
from pathlib import Path

import openpyxl

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from backend.judging.collegia import COMPOSITIONS, Collegium, JudgeCandidate, propose_panel  # noqa: E402

J = re.compile(r"JUDGE_\d+")
COLS = [Collegium.HIRING, Collegium.SENDING, Collegium.OWNERSHIP]


def load_scores(wb):
    def sheet(name):
        d = {}
        for row in wb[name].iter_rows(min_row=2, values_only=True):
            if row[0] and J.search(str(row[0])):
                d[J.search(str(row[0])).group()] = row[1:5]
        return d

    os_, ks = sheet("Оценки ОС"), sheet("Оценки КС")
    scores = {}
    for j in set(os_) | set(ks):
        s = {}
        for i, col in enumerate(COLS + [Collegium.EXPRESS]):
            vals = [float(x[j][i]) for x in (os_, ks) if j in x and x[j][i] is not None]
            if vals:
                s[col] = st.mean(vals)
        scores[j] = s
    return scores


def load_duels(wb):
    """Список (лист, [назначения (judge, collegium)], [резерв])."""
    duels = []
    for name in wb.sheetnames:
        if name.startswith(("Ответы", "Оценки")):
            continue
        rows = list(wb[name].iter_rows(values_only=True))
        hdr = next((i for r in rows for i, v in enumerate(r) if isinstance(v, str) and v.startswith("Нанимающ")), None)
        if hdr is None:
            continue
        i = 0
        while i < len(rows):
            a = rows[i][0]
            if isinstance(a, str) and re.match(r"\d\d:\d\d", a) and rows[i][hdr] and J.search(str(rows[i][hdr])):
                assigned = []
                for k in range(3):
                    if i + k >= len(rows):
                        break
                    for ci in range(3):
                        v = rows[i + k][hdr + ci]
                        if v and J.search(str(v)):
                            assigned.append((J.search(str(v)).group(), COLS[ci]))
                reserve = []
                if i + 3 < len(rows):
                    reserve = [J.search(str(v)).group() for v in rows[i + 3][hdr:hdr + 3] if v and J.search(str(v))]
                duels.append((name, assigned, reserve))
                i += 4
                continue
            i += 1
    return duels


def main(path):
    wb = openpyxl.load_workbook(path, data_only=True)
    scores = load_scores(wb)
    duels = [d for d in load_duels(wb) if len(d[1]) in COMPOSITIONS and len(d[1]) in (7, 9)]
    hist, ours, complete, best_hist, best_ours, runtimes, same = [], [], 0, 0, 0, [], 0
    n_hist = n_ours = 0
    for idx, (sheet, assigned, reserve) in enumerate(duels):
        pool_ids = set()
        for k in (idx - 1, idx, idx + 1):
            if 0 <= k < len(duels) and duels[k][0] == sheet:
                pool_ids |= {j for j, _ in duels[k][1]} | set(duels[k][2])
        cands = [JudgeCandidate(judge_id=j, scores=scores[j]) for j in sorted(pool_ids) if j in scores]
        t = time.perf_counter()
        p = propose_panel(cands, panel_size=len(assigned), reserve_size=0)
        runtimes.append(time.perf_counter() - t)
        p2 = propose_panel(cands, panel_size=len(assigned), reserve_size=0)
        same += [a.model_dump() for a in p.assignments] == [a.model_dump() for a in p2.assignments]
        complete += p.complete
        for j, col in assigned:
            if j in scores and col in scores[j]:
                hist.append(scores[j][col]); n_hist += 1
                best_hist += scores[j][col] >= max(scores[j].get(c, 0) for c in COLS)
        for a in p.assignments:
            ours.append(a.score); n_ours += 1
            best_ours += a.score >= max(scores[a.judge_id].get(c, 0) for c in COLS)
    print(f"поединков (составы 9 и 7): {len(duels)}")
    print(f"средний балл в коллегии: ручная расстановка {st.mean(hist):.2f} | алгоритм {st.mean(ours):.2f}")
    print(f"доля судей в сильнейшей коллегии: ручная {100*best_hist/n_hist:.0f}% | алгоритм {100*best_ours/n_ours:.0f}%")
    print(f"полный состав собран алгоритмом: {complete}/{len(duels)} ({100*complete/len(duels):.0f}%)")
    print(f"повторный запуск даёт тот же результат: {same}/{len(duels)}")
    print(f"время на поединок: среднее {1000*st.mean(runtimes):.1f} мс, максимум {1000*max(runtimes):.1f} мс")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else glob.glob("data/private/*.xlsx")[0])
