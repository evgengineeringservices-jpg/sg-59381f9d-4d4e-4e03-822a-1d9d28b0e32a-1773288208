import { useState } from "react";
import { MarketingLayout } from "@/components/layout/MarketingLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, ArrowRight, Search } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

const BLOG_POSTS = [
  {
    id: "1",
    title: "Understanding PCAB License Categories for Philippine Construction",
    excerpt: "A comprehensive guide to PCAB licensing requirements and how to choose the right category for your projects.",
    category: "Compliance",
    author: "Engr. Maria Santos",
    date: "2024-03-10",
    image: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=800&h=600&fit=crop",
    readTime: "5 min read",
  },
  {
    id: "2",
    title: "BIR Requirements for Construction Billing: A Complete Checklist",
    excerpt: "Everything you need to know about VAT, EWT, and retention compliance in Philippine construction billing.",
    category: "Finance",
    author: "Arch. Sofia Reyes",
    date: "2024-03-08",
    image: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&h=600&fit=crop",
    readTime: "7 min read",
  },
  {
    id: "3",
    title: "Cost Optimization Strategies for Residential Construction Projects",
    excerpt: "Proven methods to reduce material waste and optimize labor costs without compromising quality.",
    category: "Best Practices",
    author: "Engr. Juan Dela Cruz",
    date: "2024-03-05",
    image: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=800&h=600&fit=crop",
    readTime: "6 min read",
  },
  {
    id: "4",
    title: "Digital Transformation in Philippine Construction: Trends for 2024",
    excerpt: "How AI, BIM, and cloud-based project management are reshaping the construction industry.",
    category: "Technology",
    author: "Engr. Carlos Mendoza",
    date: "2024-03-01",
    image: "https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=800&h=600&fit=crop",
    readTime: "8 min read",
  },
];

const CATEGORIES = ["All", "Compliance", "Finance", "Best Practices", "Technology", "Case Studies"];

export default function BlogPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const filteredPosts = BLOG_POSTS.filter((post) => {
    const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         post.excerpt.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "All" || post.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <MarketingLayout>
      <section className="py-20 bg-light">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl mx-auto text-center mb-12"
          >
            <h1 className="text-5xl md:text-7xl font-display text-charcoal mb-6">
              Construction Insights
            </h1>
            <p className="text-lg text-gray-600">
              Expert knowledge, industry trends, and best practices for Philippine construction
            </p>
          </motion.div>

          <div className="max-w-4xl mx-auto mb-12">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search articles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-full md:w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {filteredPosts.map((post, idx) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
              >
                <Card className="overflow-hidden hover:shadow-2xl transition-all duration-300 h-full group">
                  <div className="relative h-64 overflow-hidden">
                    <img
                      src={post.image}
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <Badge className="absolute top-4 right-4 bg-gold text-charcoal">
                      {post.category}
                    </Badge>
                  </div>
                  <CardHeader>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {new Date(post.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </div>
                      <span>•</span>
                      <span>{post.readTime}</span>
                    </div>
                    <CardTitle className="text-2xl font-display text-charcoal group-hover:text-gold transition-colors">
                      {post.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 mb-4">{post.excerpt}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">{post.author}</span>
                      <Link href={`/blog/${post.id}`}>
                        <Button variant="ghost" className="group-hover:text-gold">
                          Read More
                          <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {filteredPosts.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No articles found matching your search.</p>
            </div>
          )}
        </div>
      </section>
    </MarketingLayout>
  );
}