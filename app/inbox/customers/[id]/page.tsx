import { CustomerDetailPage } from '@/components/inbox/customer-detail-page'

export default async function InboxCustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <CustomerDetailPage customerId={id} />
}
