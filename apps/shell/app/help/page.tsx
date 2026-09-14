import React from 'react';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { remark } from 'remark';
import html from 'remark-html';
import { BookOpen, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

async function getHelpTopics() {
  const contentDir = path.join(process.cwd(), 'content/help');
  if (!fs.existsSync(contentDir)) return [];

  const files = fs.readdirSync(contentDir).filter(f => f.endsWith('.md'));
  
  const topics = await Promise.all(files.map(async (filename) => {
    const filePath = path.join(contentDir, filename);
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const { data, content } = matter(fileContent);
    const processedContent = await remark().use(html).process(content);
    
    return {
      id: filename.replace(/\.md$/, ''),
      title: data.title || filename,
      description: data.description || '',
      category: data.category || 'General',
      contentHtml: processedContent.toString(),
    };
  }));

  return topics;
}

export default async function HelpPage() {
  const topics = await getHelpTopics();
  
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <div className="bg-emerald-600 text-white p-12 text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,white_0%,transparent_100%)]"></div>
        <div className="max-w-4xl mx-auto relative z-10">
          <HelpCircle className="w-12 h-12 mx-auto mb-4 opacity-80" />
          <h1 className="text-4xl font-bold mb-4">Continua Help Center</h1>
          <p className="text-emerald-50 text-lg max-w-2xl mx-auto">
            Find documentation, guides, and resources to help you get the most out of your workflow.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-8 grid grid-cols-1 md:grid-cols-4 gap-8 -mt-8 relative z-20">
        <div className="col-span-1 space-y-2">
          <div className="bg-white rounded-2xl shadow-sm border border-black/5 p-4 sticky top-8">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-2">Topics</h2>
            {topics.map(topic => (
              <a 
                key={topic.id} 
                href={`#${topic.id}`}
                className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
              >
                {topic.title}
              </a>
            ))}
            <hr className="my-4 border-black/5" />
            <Link href="/" className="block px-3 py-2 rounded-lg text-sm font-medium text-emerald-600 hover:bg-emerald-50 transition-colors">
              &larr; Back to OS
            </Link>
          </div>
        </div>

        <div className="col-span-3 space-y-8">
          {topics.map(topic => (
            <div key={topic.id} id={topic.id} className="bg-white rounded-2xl shadow-sm border border-black/5 overflow-hidden scroll-mt-8">
              <div className="px-8 py-6 border-b border-black/5 bg-slate-50">
                <div className="flex items-center gap-2 text-emerald-600 mb-2">
                  <BookOpen className="w-5 h-5" />
                  <span className="text-sm font-bold uppercase tracking-wider">{topic.category}</span>
                </div>
                <h2 className="text-3xl font-bold text-slate-900">{topic.title}</h2>
                {topic.description && (
                  <p className="text-slate-500 mt-2 text-lg">{topic.description}</p>
                )}
              </div>
              <div 
                className="p-8 prose prose-slate max-w-none prose-headings:text-slate-900 prose-a:text-emerald-600 hover:prose-a:text-emerald-700"
                dangerouslySetInnerHTML={{ __html: topic.contentHtml }}
              />
            </div>
          ))}
          {topics.length === 0 && (
            <div className="text-center p-12 bg-white rounded-2xl border border-black/5 text-slate-500">
              No help topics available yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
