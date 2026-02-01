import { TemplateEditorPage } from '@/components/inbox/template-editor-page'

export default async function InboxTemplateEditorPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <TemplateEditorPage templateId={id} />
}
