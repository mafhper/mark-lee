import Code from "@/aurora/Code";
import Download from "@/aurora/Download";
import Files from "@/aurora/Files";
import Hero from "@/aurora/Hero";
import Stage from "@/aurora/Stage";
import Themes from "@/aurora/Themes";
import Tools from "@/aurora/Tools";
import PageLayout from "@/components/PageLayout";
import { Locale } from "@/i18n";

interface ProdutoProps {
  locale: Locale;
}

/**
 * Home do site: abertura editorial, palco com o aplicativo em tres leituras,
 * arquivos, ferramentas, temas, codigo e o encerramento com downloads.
 * A ordem dos capitulos e a do documento.
 */
const Produto = ({ locale }: ProdutoProps) => (
  <PageLayout locale={locale} footer={false}>
    <Hero locale={locale} />
    <Stage locale={locale} />
    <Files locale={locale} />
    <Tools locale={locale} />
    <Themes locale={locale} />
    <Code locale={locale} />
    <Download locale={locale} />
  </PageLayout>
);

export default Produto;
