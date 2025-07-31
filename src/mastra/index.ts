import { Mastra } from "@mastra/core";
import { PinoLogger } from "@mastra/loggers";
import { LibSQLStore } from "@mastra/libsql";
import { complianceAgent } from "./agents/compliance-agent";
import { complianceWorkflow } from "./workflows/compliance-workflow";

export const mastra = new Mastra({
  agents: {
    complianceAgent,
  },
  workflows: {
    complianceWorkflow,
  },
  storage: new LibSQLStore({
    url: ":memory:",
  }),
  logger: new PinoLogger({
    name: "Mastra",
    level: "info",
  }),
});
