import type { Metadata } from "next";
import { Board } from "./Board";

export const metadata: Metadata = { title: "Gate display" };

export default function BoardPage() {
  return <Board />;
}
