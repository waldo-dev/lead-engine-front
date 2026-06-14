import { AssessmentWorkspace } from "@/components/assessments/AssessmentWorkspace";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AssessmentDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <AssessmentWorkspace assessmentId={id} />;
}
