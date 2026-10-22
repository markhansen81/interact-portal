import { createClient } from "@/lib/supabase/server";
import { PageHeader, Badge, Card, Table, TableHeader, TableRow, TableCell, TableHeaderCell } from "@/components/ui";

export default async function ContractsPage() {
 const supabase = await createClient();

 const { data: contracts } = await supabase
 .from("contracts")
 .select("*, profiles!contracts_ta_id_fkey(first_name, last_name, email)")
 .order("created_at", { ascending: false });

 const statusVariants: Record<string, "default" | "info" | "success" | "error"> = {
 draft: "default",
 sent: "info",
 signed: "success",
 declined: "error",
 };

 return (
 <div className="space-y-6">
 <PageHeader title="Contracts" />

 {!contracts || contracts.length === 0 ? (
 <Card>
 <div className="text-center py-6">
 <p className="text-neutral-500">No contracts yet.</p>
 <p className="mt-1 text-sm text-neutral-400">
 Contracts will appear here when you send framework contracts or work orders to TAs.
 </p>
 </div>
 </Card>
 ) : (
 <Card noPadding>
 <Table>
 <TableHeader>
 <tr>
 <TableHeaderCell>Title</TableHeaderCell>
 <TableHeaderCell>Type</TableHeaderCell>
 <TableHeaderCell>TA</TableHeaderCell>
 <TableHeaderCell>Sent</TableHeaderCell>
 <TableHeaderCell>Status</TableHeaderCell>
 </tr>
 </TableHeader>
 <tbody>
 {contracts.map((c) => {
 const ta = c.profiles as { first_name: string; last_name: string; email: string } | null;
 return (
 <TableRow key={c.id}>
 <TableCell className="font-medium">{c.title}</TableCell>
 <TableCell>{c.type}</TableCell>
 <TableCell>
 {ta?.first_name && ta?.last_name ? `${ta.first_name} ${ta.last_name}` : ta?.email || "\u2014"}
 </TableCell>
 <TableCell>
 {c.sent_at ? new Date(c.sent_at).toLocaleDateString() : "\u2014"}
 </TableCell>
 <TableCell>
 <Badge variant={statusVariants[c.status] || "default"}>
 {c.status}
 </Badge>
 </TableCell>
 </TableRow>
 );
 })}
 </tbody>
 </Table>
 </Card>
 )}
 </div>
 );
}
