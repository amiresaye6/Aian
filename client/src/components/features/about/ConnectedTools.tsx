"use client";

import { motion } from "motion/react";
import { MessageSquare, Video, ListChecks, Github, LayoutGrid, Users2 } from "lucide-react";

const TOOLS = [
  { name: "Slack", capability: "Chat", icon: MessageSquare, color: "#4A154B" },
  { name: "Zoom", capability: "Meetings", icon: Video, color: "#2D8CFF" },
  { name: "Jira", capability: "Tasks", icon: ListChecks, color: "#0052CC" },
  { name: "GitHub", capability: "Code", icon: Github, color: "#E8E8E8" },
  { name: "Trello", capability: "Boards", icon: LayoutGrid, color: "#0079BF" },
  { name: "Microsoft Teams", capability: "Collaboration", icon: Users2, color: "#6264A7" },
];

export function ConnectedTools() {
  return (
    <section className="relative py-16 md:py-20">
      <div className="mx-auto max-w-5xl px-6 md:px-10">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="mb-10 text-center"
        >
          <h2 className="font-display text-[26px] font-semibold text-foreground md:text-[32px]">
            Connected with your favorite tools
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-[15px] text-muted-foreground">
            Six integrations, one memory. AIAN listens where your team
            already works.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {TOOLS.map((tool, i) => (
            <motion.div
              key={tool.name}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.45, delay: i * 0.06 }}
              className="glass flex flex-col items-center gap-3 rounded-2xl px-4 py-6 text-center transition-transform hover:-translate-y-0.5"
            >
              <div
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10"
                style={{ backgroundColor: `${tool.color}1A` }}
              >
                <tool.icon className="h-5 w-5" style={{ color: tool.color }} />
              </div>
              <div>
                <div className="text-[13.5px] font-semibold text-foreground">
                  {tool.name}
                </div>
                <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                  {tool.capability}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}