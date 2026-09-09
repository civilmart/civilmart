import {
  Boxes,
  ClipboardCheck,
  Factory,
  FlaskConical,
  ShoppingCart,
  Truck,
} from "lucide-react";

const stats = [
  {
    title: "Raw Materials",
    value: "0",
    description: "Materials in system",
    icon: FlaskConical,
  },
  {
    title: "Suppliers",
    value: "0",
    description: "Registered suppliers",
    icon: Truck,
  },
  {
    title: "Stock Items",
    value: "0",
    description: "Active inventory items",
    icon: Boxes,
  },
  {
    title: "Open Purchases",
    value: "0",
    description: "Pending purchases",
    icon: ShoppingCart,
  },
  {
    title: "Production Batches",
    value: "0",
    description: "Active batches",
    icon: Factory,
  },
  {
    title: "QC Pending",
    value: "0",
    description: "Awaiting quality control",
    icon: ClipboardCheck,
  },
];

export default function Home() {
  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-muted-foreground">
          Overview of your fragrance manufacturing operations.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <div
              key={stat.title}
              className="rounded-xl border bg-card p-5 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </p>

                  <p className="mt-2 text-3xl font-bold">{stat.value}</p>

                  <p className="mt-1 text-xs text-muted-foreground">
                    {stat.description}
                  </p>
                </div>

                <div className="rounded-lg bg-muted p-3">
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="font-semibold">Recent Activity</h2>

          <div className="mt-6 flex min-h-40 items-center justify-center">
            <p className="text-sm text-muted-foreground">
              No activity yet.
            </p>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="font-semibold">Production Overview</h2>

          <div className="mt-6 flex min-h-40 items-center justify-center">
            <p className="text-sm text-muted-foreground">
              Production data will appear here.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}