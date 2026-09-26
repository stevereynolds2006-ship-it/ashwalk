import { createFileRoute } from "@tanstack/react-router";
import { AshwalkApp } from "@/components/ashwalk-app";

export const Route = createFileRoute("/")({ component: AshwalkApp });
