import { motion } from "framer-motion";
import { ZenPoemMockup } from "@/components/EditorMockup";
import PageLayout from "@/components/PageLayout";
import { HeroSection, SectionLabel } from "@/components/SectionComponents";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Locale, getCopy } from "@/i18n";

interface FAQProps {
  locale: Locale;
}

const FAQ = ({ locale }: FAQProps) => {
  const copy = getCopy(locale).pages.faq;

  return (
    <PageLayout locale={locale}>
      <HeroSection
        label={copy.hero.label}
        title={copy.hero.title}
        description={copy.hero.description}
        mockup={<ZenPoemMockup lines={copy.poemSnippet.lines} credit={copy.poemSnippet.credit} />}
      />

      <section className="border-t border-border/50">
        <div className="container py-24">
          <div className="mx-auto max-w-2xl">
            {copy.sections.map((section, sectionIndex) => (
              <motion.div
                key={section.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: sectionIndex * 0.1 }}
                className={sectionIndex > 0 ? "mt-12" : ""}
              >
                <SectionLabel>{section.title}</SectionLabel>
                <Accordion type="single" collapsible className="mt-4">
                  {section.items.map((item, itemIndex) => (
                    <AccordionItem
                      key={`${section.title}-${itemIndex}`}
                      value={`${section.title}-${itemIndex}`}
                      className="border-border/30"
                    >
                      <AccordionTrigger className="py-4 text-left text-sm font-semibold text-foreground hover:no-underline">
                        {item.question}
                      </AccordionTrigger>
                      <AccordionContent className="pb-4 text-sm leading-relaxed text-muted-foreground">
                        {item.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </PageLayout>
  );
};

export default FAQ;
