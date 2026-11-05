import type {Metadata} from 'next';
import './globals.css';
export const metadata:Metadata={title:'Brand OS · Marketing workspace',description:'Plan, create, review and publish original brand stories.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>;}
