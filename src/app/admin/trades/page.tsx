"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type TradeRow = {
  id: string;
  name: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  _count: { categories: number };
};

export default function TradesAdminPage() {
  const [trades, setTrades] = useState<TradeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function load() {
    try {
      setLoading(true);
      const res = await fetch("/api/trades");
      const data = await res.json();
      setTrades(Array.isArray(data) ? data : data?.data ?? []);
    } catch (e) {
      console.error("Failed to load trades:", e);
      toast.error("Failed to load trades.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function createTrade() {
    const name = newName.trim();
    if (!name) {
      toast.error("Trade name is required.");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/trades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to create trade.");
        return;
      }
      toast.success("Trade created.");
      setNewName("");
      await load();
    } catch (e) {
      console.error("Failed to create trade:", e);
      toast.error("Failed to create trade.");
    } finally {
      setCreating(false);
    }
  }

  async function saveRename(id: string) {
    const name = editingName.trim();
    if (!name) {
      toast.error("Trade name is required.");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch(`/api/trades/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to rename trade.");
        return;
      }
      toast.success("Trade renamed.");
      setEditingId(null);
      await load();
    } catch (e) {
      console.error("Failed to rename trade:", e);
      toast.error("Failed to rename trade.");
    } finally {
      setCreating(false);
    }
  }

  async function deleteTrade(id: string) {
    setCreating(true);
    try {
      const res = await fetch(`/api/trades/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to delete trade.");
        return;
      }
      toast.success("Trade deleted.");
      setDeletingId(null);
      await load();
    } catch (e) {
      console.error("Failed to delete trade:", e);
      toast.error("Failed to delete trade.");
    } finally {
      setCreating(false);
    }
  }

  const sorted = [...trades].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Trades</h1>
          <p className="text-sm text-muted-foreground">
            Manage construction trades your catalog is grouped by. Each trade
            holds categories and products.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add Trade</CardTitle>
        </CardHeader>
        <CardContent className="flex items-end gap-3">
          <div className="flex-1 space-y-1">
            <Label className="text-xs">Trade name</Label>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createTrade()}
              placeholder="e.g. Plumbing, Electrical..."
              className="h-8"
            />
          </div>
          <Button onClick={createTrade} disabled={creating} className="h-8">
            <Plus className="mr-1 h-3 w-3" />
            Create
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          {loading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Loading trades...
            </p>
          ) : sorted.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No trades created yet. Add your first trade above.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Categories</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((trade) => (
                  <TableRow key={trade.id}>
                    <TableCell className="font-medium">
                      {editingId === trade.id ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            className="h-7 w-40 text-sm"
                            autoFocus
                          />
                          <Button
                            size="sm"
                            className="h-7"
                            onClick={() => saveRename(trade.id)}
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7"
                            onClick={() => setEditingId(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        trade.name
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {trade.description || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="tabular-nums">
                        {trade._count.categories}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={trade.isActive ? "default" : "secondary"}
                      >
                        {trade.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7"
                          onClick={() => {
                            setEditingId(trade.id);
                            setEditingName(trade.name);
                          }}
                        >
                          Rename
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-destructive"
                          onClick={() => setDeletingId(trade.id)}
                        >
                          <Trash2 className="mr-1 h-3 w-3" />
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
