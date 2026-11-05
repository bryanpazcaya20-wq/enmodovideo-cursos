import type { Metadata } from "next";
import { ContactLink, LegalPage, LegalSection } from "@/components/legal/legal-page";
import { SITE, whatsappLink } from "@/lib/site";

export const metadata: Metadata = {
  title: "Política de reembolsos",
  description: "Los cursos son contenido digital con acceso inmediato: todas las ventas son finales y no se realizan reembolsos.",
};

export default function RefundsPage() {
  return (
    <LegalPage
      title="Política de reembolsos"
      intro={
        <div className="rounded-2xl border border-warning/40 bg-warning/10 p-5 text-text">
          <p className="font-semibold">En resumen: todas las ventas son finales</p>
          <p className="mt-1 text-muted">
            Nuestros cursos son contenido digital con <strong className="text-text">acceso inmediato y de por vida</strong>. Por eso{" "}
            <strong className="text-text">no realizamos reembolsos</strong> una vez confirmada la compra. Antes de comprar puedes ver el temario
            completo y la clase gratis de cada curso.
          </p>
        </div>
      }
    >
      <LegalSection n={1} title="Por qué no hay reembolsos">
        <p>
          Al confirmarse el pago recibes de inmediato el acceso completo a todas las clases y materiales. Como el contenido digital no se puede
          «devolver», todas las compras son definitivas, sin importar el avance que tengas en el curso.
        </p>
      </LegalSection>

      <LegalSection n={2} title="Antes de comprar">
        <ul>
          <li>Revisa el temario completo en la página de cada curso.</li>
          <li>Mira la clase gratis para conocer el estilo de enseñanza.</li>
          <li>
            Confirma que tienes el dispositivo correcto: <strong>CapCut Celular</strong> se enseña en el celular y{" "}
            <strong>CapCut PC</strong> en computadora.
          </li>
          <li>
            ¿Dudas? Escríbenos por{" "}
            <a href={whatsappLink(`${SITE.whatsappSupportText} los cursos antes de comprar`)} className="font-medium text-coral hover:text-coral-hover" target="_blank" rel="noopener noreferrer">
              WhatsApp al {SITE.whatsappNumber}
            </a>{" "}
            y te ayudamos a elegir.
          </li>
        </ul>
      </LegalSection>

      <LegalSection n={3} title="Única excepción: cobros por error">
        <p>Solo devolvemos el dinero cuando el cobro fue un error nuestro o del sistema de pagos, por ejemplo:</p>
        <ul>
          <li>Se te cobró dos veces el mismo curso.</li>
          <li>Pagaste y el acceso nunca se activó, y no logramos solucionarlo.</li>
        </ul>
        <p>
          En esos casos escríbenos por WhatsApp o a <ContactLink /> con el correo de tu cuenta y el comprobante de PayPal. Lo revisamos en un
          máximo de 2 días hábiles y devolvemos el monto cobrado de más por el mismo medio de pago.
        </p>
      </LegalSection>

      <LegalSection n={4} title="Problemas técnicos">
        <p>
          Si no puedes ver las clases, escríbenos: te ayudamos a resolverlo (navegador, conexión, inicio de sesión, cambio de correo, etc.). Un
          problema técnico de tu dispositivo o conexión no da lugar a reembolso.
        </p>
      </LegalSection>

      <LegalSection n={5} title="Disputas en PayPal">
        <p>
          Antes de abrir una disputa o un contracargo, contáctanos: casi siempre lo resolvemos más rápido. Si se abre una disputa, el acceso al
          curso se suspende mientras PayPal la revisa, y se retira definitivamente si el pago se revierte.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
