import { PageSkeleton } from "@/components/list-skeleton";

export default function Loading() {
  return <PageSkeleton stats={4} rows={6} />;
}
