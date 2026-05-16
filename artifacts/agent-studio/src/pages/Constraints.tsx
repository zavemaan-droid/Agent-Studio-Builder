import { BuildRepairConstraints } from "@/components/BuildRepairConstraints";

export default function ConstraintsPage() {
  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="px-5 py-4 border-b border-border shrink-0">
        <h1 className="text-base font-semibold">Constraints</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Deep editor for the same Build & Repair rules stored in Settings</p>
      </div>
      <div className="p-5 space-y-4 max-w-2xl mx-auto w-full">
        <BuildRepairConstraints />
      </div>
    </div>
  );
}
