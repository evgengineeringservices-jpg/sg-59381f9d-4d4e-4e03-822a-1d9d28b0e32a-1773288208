import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Building2, Menu, X } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function MarketingLayout({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { to: "/", label: "Home" },
    { to: "/work", label: "Work" },
    { to: "/services", label: "Services" },
    { to: "/about", label: "About" },
    { to: "/blog", label: "Blog" },
    { to: "/contact", label: "Contact" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <nav className="container mx-auto px-4 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2">
              <Building2 className="w-8 h-8 text-accent" />
              <span className="font-heading text-2xl tracking-wide text-foreground">BUILDCORE</span>
            </Link>

            <div className="hidden md:flex items-center gap-8">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  {link.label}
                </Link>
              ))}
              <Link to="/crm/login">
                <Button variant="default" size="sm" className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold">
                  Client Portal
                </Button>
              </Link>
            </div>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </nav>

        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden border-t border-border overflow-hidden"
            >
              <div className="container mx-auto px-4 py-4 flex flex-col gap-4">
                {navLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                ))}
                <Link to="/crm/login" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="default" size="sm" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-semibold">
                    Client Portal
                  </Button>
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main className="pt-16">{children}</main>

      <footer className="bg-primary text-primary-foreground py-12 mt-24">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Building2 className="w-8 h-8 text-accent" />
                <span className="font-heading text-2xl tracking-wide">BUILDCORE</span>
              </div>
              <p className="text-sm text-primary-foreground/80">
                Premium construction services delivering excellence in every project.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Services</h3>
              <ul className="space-y-2 text-sm text-primary-foreground/80">
                <li><Link to="/services" className="hover:text-accent transition-colors">Design-Build</Link></li>
                <li><Link to="/services" className="hover:text-accent transition-colors">Residential</Link></li>
                <li><Link to="/services" className="hover:text-accent transition-colors">Commercial</Link></li>
                <li><Link to="/services" className="hover:text-accent transition-colors">Renovation</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-sm text-primary-foreground/80">
                <li><Link to="/about" className="hover:text-accent transition-colors">About Us</Link></li>
                <li><Link to="/work" className="hover:text-accent transition-colors">Portfolio</Link></li>
                <li><Link to="/blog" className="hover:text-accent transition-colors">Blog</Link></li>
                <li><Link to="/contact" className="hover:text-accent transition-colors">Contact</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Contact</h3>
              <ul className="space-y-2 text-sm text-primary-foreground/80">
                <li>Metro Manila, Philippines</li>
                <li>+63 917 123 4567</li>
                <li>info@buildcore.ph</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-primary-foreground/20 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-primary-foreground/60">
              © 2026 BuildCore Construction. All rights reserved.
            </p>
            <div className="flex gap-4 text-sm text-primary-foreground/60">
              <Link to="#" className="hover:text-accent transition-colors">Privacy Policy</Link>
              <Link to="#" className="hover:text-accent transition-colors">Terms of Service</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}