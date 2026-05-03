import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { Toaster } from "@/components/ui/sonner";
import { StudioProvider } from "@/contexts/StudioContext";
import { Sidebar } from "@/components/Sidebar";
import { BottomNav } from "@/components/BottomNav";
import { VoiceAssistant } from "@/components/VoiceAssistant";
import AssistantPage from "@/pages/Assistant";
import StudioPage from "@/pages/Studio";
import ProjectsPage from "@/pages/Projects";
import MemoryPage from "@/pages/Memory";
import TrainingPage from "@/pages/Training";
import SettingsPage from "@/pages/Settings";
import DashboardPage from "@/pages/Dashboard";
import AgentsPage from "@/pages/Agents";
import LibraryPage from "@/pages/Library";
import EditorPage from "@/pages/Editor";
import RebuildPage from "@/pages/Rebuild";

function AppLayout() {
  return (
    <div className="flex h-full w-full overflow-hidden bg-background">
      {/* Desktop sidebar — hidden on mobile */}
      <Sidebar />

      {/* Main content — bottom padding on mobile to clear the bottom nav + safe area */}
      <main className="mobile-safe-main flex-1 min-w-0 overflow-hidden">
        <Switch>
          <Route path="/">
            <Redirect to="/dashboard" />
          </Route>
          <Route path="/dashboard"  component={DashboardPage} />
          <Route path="/assistant"  component={AssistantPage} />
          <Route path="/studio"     component={StudioPage} />
          <Route path="/projects"   component={ProjectsPage} />
          <Route path="/agents"     component={AgentsPage} />
          <Route path="/memory"     component={MemoryPage} />
          <Route path="/library"    component={LibraryPage} />
          <Route path="/training"   component={TrainingPage} />
          <Route path="/settings"   component={SettingsPage} />
          <Route path="/editor"     component={EditorPage} />
          <Route path="/rebuild"    component={RebuildPage} />
          <Route>
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground text-sm">Page not found</p>
            </div>
          </Route>
        </Switch>
      </main>

      {/* Mobile bottom navigation */}
      <BottomNav />

      {/* Jarvis floating voice bubble — positioned above bottom nav on mobile */}
      <VoiceAssistant />
    </div>
  );
}

function App() {
  return (
    <StudioProvider>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <AppLayout />
      </WouterRouter>
      <Toaster />
    </StudioProvider>
  );
}

export default App;
