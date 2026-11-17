import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppProvider } from '@/state/AppContext';
import { SiteLayout } from '@/layouts/SiteLayout';
import { ParticipantLayout } from '@/layouts/ParticipantLayout';
import { OrganizerLayout } from '@/layouts/OrganizerLayout';
import { RequireOrganizer } from '@/layouts/RequireOrganizer';
import { TournamentsPage } from '@/pages/participant/TournamentsPage';
import { LoginPage } from '@/pages/participant/LoginPage';
import { ProfilePage } from '@/pages/participant/ProfilePage';
import { TournamentPage } from '@/pages/participant/TournamentPage';
import { RoleSelectPage } from '@/pages/participant/RoleSelectPage';
import { ApplicationDetailsPage } from '@/pages/participant/ApplicationDetailsPage';
import { PartnerStepPage } from '@/pages/participant/PartnerStepPage';
import { SecondStepPage } from '@/pages/participant/SecondStepPage';
import { JudgeStepPage } from '@/pages/participant/JudgeStepPage';
import { ConsentsPage } from '@/pages/participant/ConsentsPage';
import { MyApplicationPage } from '@/pages/participant/MyApplicationPage';
import { MyTournamentsPage } from '@/pages/participant/MyTournamentsPage';
import { CompetitionsPage } from '@/pages/organizer/CompetitionsPage';
import { OrganizerLoginPage } from '@/pages/organizer/OrganizerLoginPage';
import { CreateTournamentPage } from '@/pages/organizer/CreateTournamentPage';
import { EntriesPage } from '@/pages/organizer/EntriesPage';
import { EntryCardPage } from '@/pages/organizer/EntryCardPage';
import { AvailabilityPage } from '@/pages/organizer/AvailabilityPage';
import { CollegesPage } from '@/pages/organizer/CollegesPage';
import { CollegeExplainPage } from '@/pages/organizer/CollegeExplainPage';
import { IssuesPage } from '@/pages/organizer/IssuesPage';

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<SiteLayout />}>
            {/* Участник (мобильный поток прототипа) */}
            <Route element={<ParticipantLayout />}>
              <Route path="/" element={<TournamentsPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/tournament/:id" element={<TournamentPage />} />
              <Route path="/tournament/:id/register" element={<RoleSelectPage />} />
              <Route path="/tournament/:id/apply/details" element={<ApplicationDetailsPage />} />
              <Route path="/tournament/:id/apply/player" element={<PartnerStepPage />} />
              <Route path="/tournament/:id/apply/second" element={<SecondStepPage />} />
              <Route path="/tournament/:id/apply/judge" element={<JudgeStepPage />} />
              <Route path="/tournament/:id/consents" element={<ConsentsPage />} />
              <Route path="/tournament/:id/application" element={<MyApplicationPage />} />
              <Route path="/my-tournaments" element={<MyTournamentsPage />} />
            </Route>

            {/* Организатор (десктопный поток прототипа): вход и создание — общедоступные маршруты */}
            <Route path="/organizer/login" element={<OrganizerLoginPage />} />
            <Route element={<RequireOrganizer />}>
              <Route path="/organizer" element={<OrganizerLayout />}>
                <Route index element={<CompetitionsPage />} />
                <Route path="competitions/new" element={<CreateTournamentPage />} />
                <Route path="competitions/:id/entries" element={<EntriesPage />} />
                <Route path="entries/:entryId" element={<EntryCardPage />} />
                <Route path="competitions/:id/availability" element={<AvailabilityPage />} />
                <Route path="competitions/:id/colleges" element={<CollegesPage />} />
                <Route path="colleges/explain/:judgeId" element={<CollegeExplainPage />} />
                <Route path="competitions/:id/issues" element={<IssuesPage />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}
