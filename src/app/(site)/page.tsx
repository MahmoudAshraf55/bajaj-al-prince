'use client';

import { useEffect } from 'react';
import Hero from "@/components/sections/Hero";
import OurStory from "@/components/sections/OurStory";
import WhyChooseUs from "@/components/sections/WhyChooseUs";
import ServiceHighlights from "@/components/sections/ServiceHighlights";
import CustomerReviews from "@/components/sections/CustomerReviews";
import ContactInfo from "@/components/sections/ContactInfo";
import PaymentMethods from "@/components/sections/PaymentMethods";
import FinalCTA from "@/components/sections/FinalCTA";

export default function Home() {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    
    html.classList.add('snap-y', 'snap-mandatory', 'scroll-smooth');
    body.classList.add('snap-y', 'snap-mandatory');

    return () => {
      html.classList.remove('snap-y', 'snap-mandatory', 'scroll-smooth');
      body.classList.remove('snap-y', 'snap-mandatory');
    };
  }, []);

  return (
    <div className="flex flex-col">
      <Hero />
      <OurStory />
      <WhyChooseUs />
      <ServiceHighlights />
      <CustomerReviews />
      <ContactInfo />
      <PaymentMethods />
      <FinalCTA />
    </div>
  );
}
