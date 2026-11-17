import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowIcon, ArrowLeftIcon } from './icons';
import styles from './Button.module.css';

export type ButtonVariant = 'primary' | 'outline' | 'soft' | 'greenSoft' | 'dangerSoft' | 'muted';

type CommonProps = {
  variant?: ButtonVariant;
  /** Показать стрелку «→» справа (как в прототипе) */
  arrow?: boolean;
  /** Стрелка «←» слева */
  arrowLeft?: boolean;
  children: ReactNode;
};

type ButtonAsButton = CommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & { to?: undefined; href?: undefined };

type ButtonAsLink = CommonProps & { to: string } & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'children' | 'href'>;

type ButtonAsExternal = CommonProps & { href: string; external?: boolean } & Omit<
    AnchorHTMLAttributes<HTMLAnchorElement>,
    'children' | 'href'
  >;

export type ButtonProps = ButtonAsButton | ButtonAsLink | ButtonAsExternal;

function Inner({ arrow, arrowLeft, children }: CommonProps) {
  return (
    <>
      {arrowLeft && <ArrowLeftIcon className={styles.arrow} />}
      {children}
      {arrow && <ArrowIcon className={styles.arrow} />}
    </>
  );
}

/**
 * Кнопка прототипа: 8px радиус, 12px/600, паддинги 14/9.
 * Варианты: primary (тёмно-синяя), outline (белая с синей рамкой),
 * soft (голубая), dangerSoft (красная плашка), muted (недоступная роль).
 */
export function Button(props: ButtonProps) {
  const { variant = 'primary', arrow, arrowLeft, children } = props;
  const cls = styles[variant as ButtonVariant] ?? styles.primary;

  if ('to' in props && props.to) {
    const { to, variant: _v, arrow: _a, arrowLeft: _al, children: _c, ...rest } = props as ButtonAsLink;
    return (
      <Link to={to} className={`${styles.button} ${cls}`} {...rest}>
        <Inner variant={variant} arrow={arrow} arrowLeft={arrowLeft}>
          {children}
        </Inner>
      </Link>
    );
  }

  if ('href' in props && props.href) {
    const { href, external, variant: _v, arrow: _a, arrowLeft: _al, children: _c, ...rest } = props as ButtonAsExternal;
    return (
      <a
        href={href}
        className={`${styles.button} ${cls}`}
        target={external ? '_blank' : undefined}
        rel={external ? 'noreferrer noopener' : undefined}
        {...rest}
      >
        <Inner variant={variant} arrow={arrow} arrowLeft={arrowLeft}>
          {children}
        </Inner>
      </a>
    );
  }

  const { variant: _v, arrow: _a, arrowLeft: _al, children: _c, ...rest } = props as ButtonAsButton;
  return (
    <button type="button" className={`${styles.button} ${cls}`} {...rest}>
      <Inner variant={variant} arrow={arrow} arrowLeft={arrowLeft}>
        {children}
      </Inner>
    </button>
  );
}
