export const metadata = {
  title: 'Unofficial TT Data Visualizer',
  description: 'visualise your TT usage',
}
 
export default function RootLayout({ children }) {
 return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
