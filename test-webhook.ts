import 'dotenv/config'

const res = await fetch('http://localhost:3001/api/blog/webhook', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.BLOG_API_KEY}`
  },
  body: JSON.stringify({
    title: 'Webhook HTTP Test',
    body: '## Works\n\nPosted via HTTP webhook.',
    excerpt: 'Testing webhook over HTTP.',
    tags: ['test'],
    author: 'n8n Bot',
    status: 'published'
  })
})

const data = await res.json()
console.log('Status:', res.status)
console.log('Response:', JSON.stringify(data, null, 2))

process.exit()
