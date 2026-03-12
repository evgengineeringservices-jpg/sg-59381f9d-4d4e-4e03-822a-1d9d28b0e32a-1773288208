import { MarketingLayout } from "@/components/layout/MarketingLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ArrowRight, Building2, Home, Wrench, FileText, Shield, Users } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

const SERVICES = [
  {
    icon: Building2,
    title: "Design-Build",
    description: "Comprehensive design and construction services under one roof for seamless project delivery.",
    features: [
      "Architectural design",
      "Structural engineering",
      "MEP coordination",
      "Value engineering",
      "Single-point responsibility",
    ],
  },
  {
    icon: Home,
    title: "Residential Construction",
    description: "Custom homes and residential developments built to the highest standards of quality.",
    features: [
      "Single-family homes",
      "Multi-family developments",
      "Luxury villas",
      "Townhouse projects",
      "BERDE-certified options",
    ],
  },
  {
    icon: Building2,
    title: "Commercial Construction",
    description: "Office buildings, retail spaces, and commercial complexes tailored to business needs.",
    features: [
      "Office towers",
      "Retail centers",
      "Mixed-use developments",
      "PEZA compliance",
      "BPO fit-outs",
    ],
  },
  {
    icon: Wrench,
    title: "Renovation & Retrofit",
    description: "Expert restoration and modernization of existing structures with minimal disruption.",
    features: [
      "Heritage restoration",
      "Building upgrades",
      "Seismic retrofitting",
      "Energy efficiency improvements",
      "Code compliance updates",
    ],
  },
  {
    icon: Shield,
    title: "Project Management",
    description: "Professional oversight ensuring projects stay on time, on budget, and to specification.",
    features: [
      "Planning & scheduling",
      "Cost control",
      "Quality assurance",
      "Risk management",
      "Contractor coordination",
    ],
  },
  {
    icon: FileText,
    title: "Permits & Documentation",
    description: "Complete permit acquisition and regulatory compliance support for hassle-free approvals.",
    features: [
      "Building permits",
      "Occupancy permits",
      "PCAB registration",
      "BIR compliance",
      "Environmental clearances",
    ],
  },
];

export default function ServicesPage() {
  return (
    <MarketingLayout>
      <section className="py-20 bg-light">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl mx-auto text-center mb-16"
          >
            <h1 className="text-5xl md:text-7xl font-display text-charcoal mb-6">
              Our Services
            </h1>
            <p className="text-lg text-gray-600">
              Comprehensive construction solutions from concept to completion
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
            {SERVICES.map((service, idx) => {
              const Icon = service.icon;
              return (
                <motion.div
                  key={service.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: idx * 0.1 }}
                >
                  <Card className="h-full hover:shadow-2xl transition-all duration-300 border-2 hover:border-gold">
                    <CardHeader>
                      <div className="h-14 w-14 rounded-2xl bg-gold/10 flex items-center justify-center mb-4">
                        <Icon className="h-7 w-7 text-gold" />
                      </div>
                      <CardTitle className="text-2xl font-display text-charcoal">
                        {service.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-600 mb-6">{service.description}</p>
                      <ul className="space-y-3">
                        {service.features.map((feature) => (
                          <li key={feature} className="flex items-start gap-2">
                            <CheckCircle2 className="h-5 w-5 text-gold mt-0.5 flex-shrink-0" />
                            <span className="text-sm text-gray-700">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="bg-charcoal text-white rounded-3xl p-12 text-center"
          >
            <Users className="h-16 w-16 text-gold mx-auto mb-6" />
            <h2 className="text-4xl font-display mb-4">Ready to Start Your Project?</h2>
            <p className="text-gray-300 mb-8 max-w-2xl mx-auto">
              Our team is ready to bring your vision to life with exceptional craftsmanship and professional service.
            </p>
            <Link href="/contact">
              <Button size="lg" className="bg-gold text-charcoal hover:bg-gold/90">
                Get a Free Consultation
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>
    </MarketingLayout>
  );
}