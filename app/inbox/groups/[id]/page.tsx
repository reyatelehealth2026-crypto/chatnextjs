import { GroupDetailPage } from '@/components/inbox/group-detail-page'

export default async function GroupDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <GroupDetailPage groupId={id} />
}
