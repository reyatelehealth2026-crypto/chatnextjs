import { SegmentEditorPage } from '@/components/inbox/segment-editor-page'

export default async function InboxSegmentEditorPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <SegmentEditorPage segmentId={id} />
}
