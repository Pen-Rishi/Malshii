import { useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import { useAppStore } from "@/store/appStore";
import { useAuthStore } from "@/lib/auth";

import LoginPage from "@/pages/LoginPage";
import Dashboard from "@/pages/Dashboard";
import ImportPage from "@/pages/ImportPage";
import SubjectsPage from "@/pages/SubjectsPage";
import SubjectDetailPage from "@/pages/SubjectDetailPage";
import TopicDetailPage from "@/pages/TopicDetailPage";
import QuestionsPage from "@/pages/QuestionsPage";
import QuestionDetailPage from "@/pages/QuestionDetailPage";
import AnalyticsPage from "@/pages/AnalyticsPage";
import PracticePage from "@/pages/PracticePage";
import ReviewPage from "@/pages/ReviewPage";
import BookmarksPage from "@/pages/BookmarksPage";
import NotesPage from "@/pages/NotesPage";
import ExportPage from "@/pages/ExportPage";
import SettingsPage from "@/pages/SettingsPage";
import NotificationPopup from "@/components/NotificationPopup";

function App() {
  const { sidebarOpen } = useAppStore();
  const { isAuthenticated, checkSession } = useAuthStore();

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-bg)]">
      <NotificationPopup />
      <Sidebar />

      <div
        className="flex flex-1 flex-col overflow-hidden sidebar-transition"
        style={{
          marginLeft: sidebarOpen
            ? "var(--sidebar-width)"
            : "var(--sidebar-collapsed-width)",
        }}
      >
        <Header />

        <main
          className="flex-1 overflow-y-auto bg-[var(--color-bg-secondary)] p-6"
          style={{ marginTop: "var(--header-height)" }}
        >
          <div className="mx-auto max-w-7xl fade-in">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/import" element={<ImportPage />} />
              <Route path="/subjects" element={<SubjectsPage />} />
              <Route path="/subjects/:subject" element={<SubjectDetailPage />} />
              <Route
                path="/subjects/:subject/:topic"
                element={<TopicDetailPage />}
              />
              <Route path="/questions" element={<QuestionsPage />} />
              <Route path="/questions/:id" element={<QuestionDetailPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/practice" element={<PracticePage />} />
              <Route path="/review" element={<ReviewPage />} />
              <Route path="/bookmarks" element={<BookmarksPage />} />
              <Route path="/notes" element={<NotesPage />} />
              <Route path="/export" element={<ExportPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
