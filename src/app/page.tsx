import { redirect } from 'next/navigation';

export default function Home() {
  // Redirect to the brands page by default
  redirect('/brands');
  
  // This return statement is just a fallback and won't be rendered
  return null;
}
