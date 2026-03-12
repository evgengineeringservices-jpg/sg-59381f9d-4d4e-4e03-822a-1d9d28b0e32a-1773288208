import { MarketingLayout } from "@/components/layout/MarketingLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Award, Users, Target, Shield, Briefcase, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

const TEAM_MEMBERS = [
  {
    name: "Engr. Maria Santos",
    role: "Chief Executive Officer",
    image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop",
    credentials: "Licensed Civil Engineer, PMP",
  },
  {
    name: "Engr. Juan Dela Cruz",
    role: "VP of Operations",
    image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop",
    credentials: "Licensed Civil Engineer, ASEAN Eng.",
  },
  {
    name: "Arch. Sofia Reyes",
    role: "Chief Design Officer",
    image: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop",
    credentials: "Licensed Architect, LEED AP",
  },
  {
    name: "Engr. Carlos Mendoza",
    role: "Project Manager",
    image: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&h=400&fit=crop",
    credentials: "Licensed Civil Engineer, PCAB AAA",
  },
];

const VALUES = [
  {
    icon: Shield,
    title: "Safety First",
    description: "Zero-accident culture with comprehensive safety protocols on every project site.",
  },
  {
    icon: Award,
    title: "Quality Excellence",
    description: "Uncompromising standards backed by ISO 9001 certification and rigorous QA processes.",
  },
  {
    icon: Target,
    title: "Client Focus",
    description: "Transparent communication and collaborative partnerships that exceed expectations.",
  },
  {
    icon: Users,
    title: "Team Empowerment",
    description: "Investing in our people through continuous training and professional development.",
  },
];

const CERTIFICATIONS = [
  "PCAB License AAA",
  "ISO 9001:2015 Certified",
  "CIAP Member",
  "Phil-GEPS Registered",
  "BIR Registered",
  "DOLE Compliant",
];

export default function AboutPage() {
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
              About Us
            </h1>
            <p className="text-lg text-gray-600">
              Building the Philippines, one exceptional project at a time
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-12 mb-20">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <h2 className="text-4xl font-display text-charcoal mb-6">Our Story</h2>
              <div className="space-y-4 text-gray-700">
                <p>
                  Founded in 2010, Premier Construction Inc. has grown from a small team of dedicated
                  engineers to one of the Philippines' most trusted construction firms. Our journey began
                  with a simple mission: deliver exceptional quality while maintaining the highest
                  standards of safety and integrity.
                </p>
                <p>
                  Over the past decade, we've completed over 200 projects across residential, commercial,
                  and industrial sectors. From luxury homes in Forbes Park to PEZA-certified office towers
                  in BGC, our portfolio speaks to our versatility and commitment to excellence.
                </p>
                <p>
                  Today, we combine traditional craftsmanship with cutting-edge technology, including
                  AI-assisted project planning and real-time cost management systems. This enables us to
                  deliver projects faster, more efficiently, and with greater transparency than ever before.
                </p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="relative h-96 lg:h-auto rounded-2xl overflow-hidden"
            >
              <img
                src="https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=800&h=600&fit=crop"
                alt="Construction team"
                className="w-full h-full object-cover"
              />
            </motion.div>
          </div>

          <div className="mb-20">
            <h2 className="text-4xl font-display text-charcoal text-center mb-12">Our Values</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {VALUES.map((value, idx) => {
                const Icon = value.icon;
                return (
                  <motion.div
                    key={value.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: idx * 0.1 }}
                  >
                    <Card className="h-full text-center hover:shadow-xl transition-all duration-300">
                      <CardContent className="pt-8">
                        <div className="h-16 w-16 rounded-full bg-gold/10 flex items-center justify-center mx-auto mb-4">
                          <Icon className="h-8 w-8 text-gold" />
                        </div>
                        <h3 className="text-xl font-display text-charcoal mb-3">{value.title}</h3>
                        <p className="text-gray-600 text-sm">{value.description}</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </div>

          <div className="mb-20">
            <h2 className="text-4xl font-display text-charcoal text-center mb-12">Leadership Team</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {TEAM_MEMBERS.map((member, idx) => (
                <motion.div
                  key={member.name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: idx * 0.1 }}
                >
                  <Card className="overflow-hidden hover:shadow-xl transition-all duration-300">
                    <div className="aspect-square overflow-hidden">
                      <img
                        src={member.image}
                        alt={member.name}
                        className="w-full h-full object-cover hover:scale-110 transition-transform duration-500"
                      />
                    </div>
                    <CardContent className="p-6 text-center">
                      <h3 className="font-display text-xl text-charcoal mb-1">{member.name}</h3>
                      <p className="text-gold font-medium mb-2">{member.role}</p>
                      <p className="text-xs text-gray-500">{member.credentials}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="bg-charcoal text-white rounded-3xl p-12"
          >
            <div className="max-w-4xl mx-auto">
              <h2 className="text-4xl font-display text-center mb-8">Certifications & Compliance</h2>
              <div className="grid md:grid-cols-3 gap-4">
                {CERTIFICATIONS.map((cert) => (
                  <div
                    key={cert}
                    className="flex items-center gap-3 bg-white/5 rounded-xl p-4 hover:bg-white/10 transition-colors"
                  >
                    <CheckCircle2 className="h-6 w-6 text-gold flex-shrink-0" />
                    <span className="font-medium">{cert}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </MarketingLayout>
  );
}