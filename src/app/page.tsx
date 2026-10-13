"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/client/api";
import { AppShell, type ViewKey, type AppUser } from "@/components/shared/app-shell";
import { LoginScreen } from "@/components/shared/login-screen";
import { DashboardView } from "@/components/views/dashboard-view";
import { DemandsView } from "@/components/views/demands-view";
import { DemandDetailView } from "@/components/views/demand-detail-view";
import { ResourcesView } from "@/components/views/resources-view";
import { ResourceDetailView } from "@/components/views/resource-detail-view";
import { ResourceDatabaseView } from "@/components/views/resource-database-view";
import { KanbanView } from "@/components/views/kanban-view";
import { ClientsView } from "@/components/views/clients-view";
import { ReportsView } from "@/components/views/reports-view";
import { AtsValidatorView } from "@/components/views/ats-validator-view";
import { ImportExportView } from "@/components/views/import-export-view";
import { ActivityView } from "@/components/views/activity-view";
import { SettingsView } from "@/components/views/settings-view";
import { UsersView } from "@/components/views/users-view";
import {
  DemandFormModal, ResourceFormModal, ClientFormModal, AssignmentMoveModal,
} from "@/components/shared/dialogs";
import { ResourcePickerModal } from "@/components/shared/resource-picker-modal";

export default function Home() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [view, setView] = useState<ViewKey>("dashboard");
  const [demandFilter, setDemandFilter] = useState<{ priority?: string; status?: string } | undefined>();
  const [resourceFilter, setResourceFilter] = useState<{ status?: string } | undefined>();
  const [openDemandId, setOpenDemandId] = useState<string | null>(null);
  const [openResourceId, setOpenResourceId] = useState<string | null>(null);
  const [openClientId, setOpenClientId] = useState<string | null>(null);
  // Detail mode (when a record is open) takes precedence over list views
  const [detailMode, setDetailMode] = useState<null | "demand" | "resource">(null);

  // Modals
  const [demandModal, setDemandModal] = useState(false);
  const [editingDemandId, setEditingDemandId] = useState<string | null>(null);
  const [resourceModal, setResourceModal] = useState(false);
  const [editingResourceId, setEditingResourceId] = useState<string | null>(null);
  const [clientModal, setClientModal] = useState(false);
  const [moveModal, setMoveModal] = useState<{ assignmentId: string; current: string } | null>(null);
  // Resource picker (for assigning resources to a demand → creates Kanban assignment)
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerDemandId, setPickerDemandId] = useState<string | null>(null);
  const [pickerDemandLabel, setPickerDemandLabel] = useState<string | undefined>(undefined);
  // Track a "refresh key" to force detail view to reload after edits
  const [refreshKey, setRefreshKey] = useState(0);

  // Check session on mount
  useEffect(() => {
    api<{ user: AppUser | null }>("/api/auth/me").then(r => {
      if (r.user) setUser(r.user);
    }).catch(() => {}).finally(() => setAuthChecked(true));
  }, []);

  const handleLogin = (u: AppUser) => setUser(u);

  const handleLogout = async () => {
    try { await api("/api/auth/logout", { method: "POST" }); } catch {}
    setUser(null);
    setView("dashboard");
    setDetailMode(null);
  };

  const changeView = (v: ViewKey) => {
    setView(v);
    setDetailMode(null);
    setOpenDemandId(null);
    setOpenResourceId(null);
    if (v === "demands") setDemandFilter(undefined);
    if (v === "resources") setResourceFilter(undefined);
  };

  const openDemand = (id: string) => { setOpenDemandId(id); setDetailMode("demand"); };
  const openResource = (id: string) => { setOpenResourceId(id); setDetailMode("resource"); };

  const handleQuickAdd = (target: "demand" | "resource" | "import") => {
    if (target === "demand") { setEditingDemandId(null); setDemandModal(true); }
    if (target === "resource") { setEditingResourceId(null); setResourceModal(true); }
    if (target === "import") changeView("import-export");
  };

  // Edit handlers
  const handleEditDemand = (id: string) => {
    setEditingDemandId(id);
    setDemandModal(true);
  };
  const handleEditResource = (id: string) => {
    setEditingResourceId(id);
    setResourceModal(true);
  };

  // Resource picker — opens the modal to add a resource to a demand (creates Kanban assignment)
  const handleAddCandidate = (demandId: string) => {
    setPickerDemandId(demandId);
    // Fetch the demand label for display in the modal header
    api<{ demand: { demandId: string; positionTitle: string; client: string } }>(`/api/demands/${demandId}`)
      .then(r => setPickerDemandLabel(`${r.demand.demandId} — ${r.demand.positionTitle} (${r.demand.client})`))
      .catch(() => setPickerDemandLabel(undefined));
    setPickerOpen(true);
  };

  // Show login if not authenticated
  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a14]">
        <div className="animate-pulse text-slate-400">Loading Optinus Resource Management…</div>
      </div>
    );
  }
  if (!user) return <LoginScreen onLogin={handleLogin} />;

  // Drilldowns from dashboard
  const drillToDemands = (filter?: { priority?: string; status?: string }) => {
    setDemandFilter(filter);
    setResourceFilter(undefined);
    setDetailMode(null);
    setView("demands");
  };
  const drillToResources = (filter?: { status?: string }) => {
    setResourceFilter(filter);
    setDemandFilter(undefined);
    setDetailMode(null);
    setView("resources");
  };
  const drillToKanban = () => changeView("kanban");

  return (
    <>
      <AppShell
        user={user}
        activeView={view}
        onChangeView={changeView}
        onLogout={handleLogout}
        onQuickAdd={handleQuickAdd}
        onSelectDemand={openDemand}
        onSelectResource={openResource}
        onSelectClient={(id) => { setOpenClientId(id); changeView("clients"); }}
      >
        {detailMode === "demand" && openDemandId ? (
          <DemandDetailView
            key={`demand-${openDemandId}-${refreshKey}`}
            demandId={openDemandId}
            userRole={user.role}
            onBack={() => { setDetailMode(null); setOpenDemandId(null); }}
            onOpenResource={(id) => { setOpenResourceId(id); setDetailMode("resource"); }}
            onMoveAssignment={(assignmentId, currentStage) => setMoveModal({ assignmentId, current: currentStage })}
            onEditDemand={handleEditDemand}
            onAddCandidate={handleAddCandidate}
          />
        ) : detailMode === "resource" && openResourceId ? (
          <ResourceDetailView
            key={`resource-${openResourceId}-${refreshKey}`}
            resourceId={openResourceId}
            userRole={user.role}
            onBack={() => { setDetailMode(null); setOpenResourceId(null); }}
            onOpenDemand={(id) => { setOpenDemandId(id); setDetailMode("demand"); }}
          />
        ) : view === "dashboard" ? (
          <DashboardView
            onDrillDemands={drillToDemands}
            onDrillResources={drillToResources}
            onDrillKanban={drillToKanban}
          />
        ) : view === "demands" ? (
          <DemandsView
            initialFilter={demandFilter}
            onOpenDemand={openDemand}
            onNewDemand={() => { setEditingDemandId(null); setDemandModal(true); }}
            onEditDemand={handleEditDemand}
          />
        ) : view === "resources" ? (
          <ResourcesView
            initialFilter={resourceFilter}
            onOpenResource={openResource}
            onNewResource={() => { setEditingResourceId(null); setResourceModal(true); }}
            onEditResource={handleEditResource}
          />
        ) : view === "resource-database" ? (
          <ResourceDatabaseView
            onOpenResource={openResource}
            onEditResource={handleEditResource}
          />
        ) : view === "kanban" ? (
          <KanbanView
            onNewResource={() => { setEditingResourceId(null); setResourceModal(true); }}
          />
        ) : view === "clients" ? (
          <ClientsView
            onOpenClient={() => {}}
            onNewClient={() => setClientModal(true)}
            onNewDemand={() => { setEditingDemandId(null); setDemandModal(true); }}
          />
        ) : view === "reports" ? (
          <ReportsView />
        ) : view === "ats-validator" ? (
          <AtsValidatorView />
        ) : view === "import-export" ? (
          <ImportExportView />
        ) : view === "activity" ? (
          <ActivityView />
        ) : view === "settings" ? (
          <SettingsView user={{ role: user.role }} />
        ) : view === "users" ? (
          <UsersView />
        ) : null}
      </AppShell>

      {/* Modals */}
      <DemandFormModal
        open={demandModal}
        editingId={editingDemandId}
        onClose={() => { setDemandModal(false); setEditingDemandId(null); }}
        onSaved={() => {
          // Force detail view to reload if we were editing an open demand
          if (editingDemandId && openDemandId === editingDemandId) setRefreshKey(k => k + 1);
          // Force list view to refetch by toggling a no-op state change
          setView(v => v);
        }}
      />
      <ResourceFormModal
        open={resourceModal}
        editingId={editingResourceId}
        onClose={() => { setResourceModal(false); setEditingResourceId(null); }}
        onSaved={() => {
          if (editingResourceId && openResourceId === editingResourceId) setRefreshKey(k => k + 1);
          setView(v => v);
        }}
      />
      <ClientFormModal open={clientModal} onClose={() => setClientModal(false)} onSaved={() => {}} />
      <AssignmentMoveModal
        open={!!moveModal}
        onClose={() => setMoveModal(null)}
        assignmentId={moveModal?.assignmentId ?? null}
        currentStage={moveModal?.current ?? null}
      />
      <ResourcePickerModal
        open={pickerOpen}
        demandId={pickerDemandId}
        demandLabel={pickerDemandLabel}
        onClose={() => { setPickerOpen(false); setPickerDemandId(null); setPickerDemandLabel(undefined); }}
        onAssigned={() => {
          // Force demand detail to reload so the new assignment shows in the Candidates tab
          if (pickerDemandId && openDemandId === pickerDemandId) setRefreshKey(k => k + 1);
        }}
      />
    </>
  );
}
