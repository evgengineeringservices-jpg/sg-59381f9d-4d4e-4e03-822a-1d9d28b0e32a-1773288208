import { useState } from "react";
import { MarketingLayout } from "@/components/layout/MarketingLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Calendar, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

const PROJECTS = [
  {
    id: 1,
    name: "Modern Villa Residence",
    type: "Residential",
    location: "Alabang, Metro Manila",
    image: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&h=600&fit=crop",
    status: "Completed",
    year: "2024",
    description: "Luxury 3-storey modern villa with smart home integration",
  },
  {
    id: 2,
    name: "Corporate Office Tower",
    type: "Commercial",
    location: "BGC, Taguig",
    image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&h=600&fit=crop",
    status: "In Progress",
    year: "2024",
    description: "15-storey PEZA-certified corporate headquarters",
  },
  {
    id: 3,
    name: "Heritage Renovation",
    type: "Renovation",
    location: "Intramuros, Manila",
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop",
    status: "Completed",
    year: "2023",
    description: "Restoration of historic colonial building",
  },
  {
    id: 4,
    name: "Industrial Warehouse Complex",
    type: "Industrial",
    location: "Laguna Technopark",
    image: "https://images.unsplash.com/photo-1587293852726-70cdb56c2866?w=800&h=600&fit=crop",
    status: "Completed",
    year: "2023",
    description: "50,000 sqm logistics and distribution facility",
  },
  {
    id: 5,
    name: "Luxury Condominium",
    type: "Residential",
    location: "Makati CBD",
    image: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&h=600&fit=crop",
    status: "In Progress",
    year: "2024",
    description: "Premium high-rise residential development",
  },
  {
    id: 6,
    name: "Shopping Mall Expansion",
    type: "Commercial",
    location: "Quezon City",
    image: "https://images.unsplash.com/photo-1519643381401-22c77e60520e?w=800&h=600&fit=crop",
    status: "Planning",
    year: "2025",
    description: "Major retail expansion and renovation project",
  },
];

export default function WorkPage() {
  const [filter, setFilter] = useState("all");

  const filteredProjects = filter === "all" 
    ? PROJECTS 
    : PROJECTS.filter(p => p.type === filter);

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
              Our Work
            </h1>
            <p className="text-lg text-gray-600">
              A showcase of exceptional construction projects delivered across the Philippines
            </p>
          </motion.div>

          <div className="flex justify-center mb-12">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                <SelectItem value="Residential">Residential</SelectItem>
                <SelectItem value="Commercial">Commercial</SelectItem>
                <SelectItem value="Industrial">Industrial</SelectItem>
                <SelectItem value="Renovation">Renovation</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredProjects.map((project, idx) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
              >
                <Card className="overflow-hidden hover:shadow-2xl transition-all duration-300 group">
                  <div className="relative h-64 overflow-hidden">
                    <img
                      src={project.image}
                      alt={project.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute top-4 right-4 flex gap-2">
                      <Badge className="bg-gold text-charcoal">{project.type}</Badge>
                      <Badge variant="secondary">{project.status}</Badge>
                    </div>
                  </div>
                  <CardContent className="p-6">
                    <h3 className="text-2xl font-display text-charcoal mb-2">
                      {project.name}
                    </h3>
                    <p className="text-gray-600 mb-4">{project.description}</p>
                    <div className="space-y-2 text-sm text-gray-500">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        {project.location}
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {project.year}
                      </div>
                    </div>
                    <Button variant="ghost" className="mt-4 group-hover:text-gold">
                      View Details
                      <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}