import { useRouter } from "next/router";
import { MarketingLayout } from "@/components/layout/MarketingLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, User, ArrowLeft, Share2 } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

const BLOG_POST = {
  id: "1",
  title: "Understanding PCAB License Categories for Philippine Construction",
  content: `
    <h2>What is PCAB?</h2>
    <p>The Philippine Contractors Accreditation Board (PCAB) is the government agency responsible for regulating and licensing construction contractors in the Philippines. Understanding PCAB license categories is crucial for any construction company operating in the country.</p>

    <h2>PCAB License Categories</h2>
    <p>PCAB licenses are categorized based on the contractor's capacity to undertake projects of varying sizes and complexities:</p>

    <h3>AAA - Quadruple A Category</h3>
    <p>The highest license category, AAA allows contractors to undertake projects of unlimited value. This is typically reserved for the largest and most established construction firms with proven track records.</p>

    <h3>AA - Triple A Category</h3>
    <p>AA license holders can undertake projects up to ₱500 million. This category is suitable for medium to large construction companies with substantial resources.</p>

    <h3>A, B, C, D Categories</h3>
    <p>These categories have progressively lower project value limits, with Category A at ₱50 million, Category B at ₱30 million, Category C at ₱15 million, and Category D at ₱3 million.</p>

    <h3>Small Categories</h3>
    <p>Small A and Small B categories are designed for smaller contractors, with project limits of ₱3 million and ₱1 million respectively.</p>

    <h2>Requirements for PCAB Registration</h2>
    <p>To obtain a PCAB license, contractors must submit various documents including:</p>
    <ul>
      <li>SEC Registration or DTI Certificate</li>
      <li>Mayor's Permit</li>
      <li>BIR Certificate of Registration</li>
      <li>Audited Financial Statements</li>
      <li>List of completed projects</li>
      <li>Technical personnel certifications</li>
    </ul>

    <h2>Why PCAB Compliance Matters</h2>
    <p>PCAB compliance is not just a legal requirement—it's essential for:</p>
    <ul>
      <li>Bidding on government projects</li>
      <li>Building client trust and credibility</li>
      <li>Ensuring project quality standards</li>
      <li>Protecting your business reputation</li>
    </ul>

    <h2>Maintaining Your PCAB License</h2>
    <p>PCAB licenses must be renewed regularly. Keep your license active by:</p>
    <ul>
      <li>Submitting renewal documents on time</li>
      <li>Maintaining required technical personnel</li>
      <li>Updating completed project records</li>
      <li>Ensuring financial statements are current</li>
    </ul>

    <h2>Conclusion</h2>
    <p>Understanding and maintaining proper PCAB licensing is fundamental to operating a successful construction business in the Philippines. Choose the category that matches your company's capabilities and growth plans, and ensure you stay compliant with all requirements.</p>
  `,
  category: "Compliance",
  author: "Engr. Maria Santos",
  authorTitle: "Chief Executive Officer",
  date: "2024-03-10",
  image: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=1200&h=600&fit=crop",
  readTime: "5 min read",
};

export default function BlogPostPage() {
  const router = useRouter();
  const { id } = router.query;

  return (
    <MarketingLayout>
      <article className="py-20 bg-light">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-4xl mx-auto"
          >
            <Link href="/blog">
              <Button variant="ghost" className="mb-8">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Articles
              </Button>
            </Link>

            <div className="mb-8">
              <Badge className="mb-4 bg-gold text-charcoal">{BLOG_POST.category}</Badge>
              <h1 className="text-4xl md:text-6xl font-display text-charcoal mb-6">
                {BLOG_POST.title}
              </h1>
              <div className="flex flex-wrap items-center gap-6 text-muted-foreground">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <div>
                    <div className="font-medium text-charcoal">{BLOG_POST.author}</div>
                    <div className="text-sm">{BLOG_POST.authorTitle}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {new Date(BLOG_POST.date).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {BLOG_POST.readTime}
                </div>
                <Button variant="ghost" size="sm" className="ml-auto">
                  <Share2 className="mr-2 h-4 w-4" />
                  Share
                </Button>
              </div>
            </div>

            <div className="relative h-96 rounded-2xl overflow-hidden mb-12">
              <img
                src={BLOG_POST.image}
                alt={BLOG_POST.title}
                className="w-full h-full object-cover"
              />
            </div>

            <div
              className="prose prose-lg max-w-none prose-headings:font-display prose-headings:text-charcoal prose-a:text-gold prose-strong:text-charcoal"
              dangerouslySetInnerHTML={{ __html: BLOG_POST.content }}
            />

            <div className="mt-12 pt-8 border-t">
              <div className="bg-charcoal text-white rounded-2xl p-8">
                <h3 className="text-2xl font-display mb-4">Need Expert Construction Services?</h3>
                <p className="text-gray-300 mb-6">
                  Our team of licensed professionals is ready to help with your next project.
                </p>
                <Link href="/contact">
                  <Button size="lg" className="bg-gold text-charcoal hover:bg-gold/90">
                    Get In Touch
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </article>
    </MarketingLayout>
  );
}