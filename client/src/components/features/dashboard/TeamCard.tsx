// "use client";

// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { useMembers } from "@/hooks/use-members";

// export function TeamCard({ organizationId }: { organizationId: string }) {
//   const { data: members } = useMembers(organizationId);
//   const activeMembers = members?.filter((m) => m.memberStatus === "active") ?? [];
//   const visible = activeMembers.slice(0, 6);
//   const remaining = activeMembers.length - visible.length;

//   return (
//     <Card>
//       <CardHeader className="pb-2">
//         <CardTitle className="text-sm font-medium">Team</CardTitle>
//       </CardHeader>
//       <CardContent>
//         <div className="flex -space-x-2">
//           {visible.map((m) => (
//             <div
//               key={m.id}
//               title={`${m.fullName} — ${m.role.name}`}
//               className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-[color:var(--surface)] bg-white/[0.06] text-[12px] font-semibold"
//             >
//               {m.fullName.charAt(0)}
//             </div>
//           ))}
//           {remaining > 0 && (
//             <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-[color:var(--surface)] bg-white/[0.03] text-[11px] text-muted-foreground">
//               +{remaining}
//             </div>
//           )}
//         </div>
//       </CardContent>
//     </Card>
//   );
// }