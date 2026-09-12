import { auth } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64 = buffer.toString('base64')
    const mimeType = file.type || 'application/octet-stream'
    const fileName = file.name || 'document'

    const isImage = mimeType.startsWith('image/')
    const isPDF = mimeType === 'application/pdf'
    const isText = mimeType.startsWith('text/') || fileName.endsWith('.csv') || fileName.endsWith('.txt')

    let contentBlock: Anthropic.MessageParam['content']

    if (isImage) {
      const validImageType = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(mimeType)
        ? mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
        : 'image/jpeg'
      contentBlock = [
        {
          type: 'image',
          source: { type: 'base64', media_type: validImageType, data: base64 },
        },
        {
          type: 'text',
          text: `This is a financial document: "${fileName}". Please extract ALL financial information from it:

1. **Document type** (bank statement, credit card statement, utility bill, invoice, receipt, etc.)
2. **Account/Institution** name and account number (last 4 digits only)
3. **Date range** covered
4. **All transactions** — list each with: date, description, amount (+ for credits/income, - for debits/expenses)
5. **Summary totals** (total income, total expenses, ending balance if shown)
6. **Bills or recurring charges** identified
7. **Any due dates or payment obligations**

Format the transactions as a clear table and give a summary paragraph at the end highlighting key patterns.`,
        },
      ]
    } else if (isPDF) {
      contentBlock = [
        {
          type: 'document' as any,
          source: { type: 'base64', media_type: 'application/pdf', data: base64 },
        } as any,
        {
          type: 'text',
          text: `This is a financial document: "${fileName}". Please extract ALL financial information from it:

1. **Document type** (bank statement, credit card statement, utility bill, invoice, receipt, etc.)
2. **Account/Institution** name and account number (last 4 digits only)  
3. **Date range** covered
4. **All transactions** — list each with: date, description, amount (+ for credits/income, - for debits/expenses)
5. **Summary totals** (total income, total expenses, ending balance if shown)
6. **Bills or recurring charges** identified
7. **Any due dates or payment obligations**

Format the transactions as a clear table and give a summary paragraph at the end highlighting key patterns and anything I should pay attention to.`,
        },
      ]
    } else if (isText) {
      const text = buffer.toString('utf-8')
      contentBlock = [
        {
          type: 'text',
          text: `Here is the content of a financial document "${fileName}":\n\n${text}\n\nPlease extract ALL financial information from it:\n\n1. **Document type**\n2. **Account/Institution**\n3. **Date range**\n4. **All transactions** with date, description, amount\n5. **Summary totals**\n6. **Bills or recurring charges**\n7. **Due dates or obligations**\n\nFormat transactions as a clear table and give a summary paragraph highlighting key patterns.`,
        },
      ]
    } else {
      return NextResponse.json({ error: `File type "${mimeType}" not supported. Please upload a PDF, image (JPEG/PNG), or CSV file.` }, { status: 400 })
    }

    const response = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 4096,
      messages: [{ role: 'user', content: contentBlock as any }],
    })

    const extracted = response.content
      .filter(b => b.type === 'text')
      .map(b => (b as Anthropic.TextBlock).text)
      .join('\n')

    return NextResponse.json({
      success: true,
      fileName,
      mimeType,
      extracted,
      summary: `📄 **Analyzed: ${fileName}**\n\n${extracted}`,
    })
  } catch (err: any) {
    console.error('[upload-doc]', err)
    return NextResponse.json({ error: err.message || 'Failed to process document' }, { status: 500 })
  }
}
