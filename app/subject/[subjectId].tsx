import { useLocalSearchParams } from "expo-router";

import { SubjectDetailScreen } from "@/components/subjects/subject-detail-screen";

export default function SubjectDetailRoute() {
  const { subjectId } = useLocalSearchParams<{ subjectId: string }>();

  return <SubjectDetailScreen subjectId={subjectId} />;
}
