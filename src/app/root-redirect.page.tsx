import { redirect } from 'next/navigation';

export default function RootRedirect() {
  redirect('/brands');
  return null;
}