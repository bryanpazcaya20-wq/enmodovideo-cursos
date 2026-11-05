import type { Metadata } from "next";
import Link from "next/link";
import { ContactLink, LegalPage, LegalSection } from "@/components/legal/legal-page";
import { LEGAL, SITE } from "@/lib/site";

export const metadata: Metadata = { title: "Términos y condiciones" };

const link = "text-coral hover:text-coral-hover";

export default function TermsPage() {
  return (
    <LegalPage
      title="Términos y condiciones"
      intro={
        <p>
          Estos términos regulan la compra y el uso de los cursos en línea de <strong className="text-text">{LEGAL.businessName}</strong> en{" "}
          {SITE.websiteLabel}. Al crear una cuenta o comprar un curso aceptas estas condiciones.
        </p>
      }
    >
      <LegalSection n={1} title="El servicio">
        <p>
          Vendemos cursos en video de edición con CapCut, organizados en módulos y clases. Cada curso se compra por separado, con un{" "}
          <strong>pago único</strong>: no es una suscripción y no hay cobros recurrentes.
        </p>
      </LegalSection>

      <LegalSection n={2} title="Tu cuenta">
        <ul>
          <li>Necesitas una cuenta (con Google o con correo y contraseña) para comprar y ver los cursos.</li>
          <li>
            La cuenta es <strong>personal e intransferible</strong>. Solo puede tener una sesión abierta a la vez: al entrar desde un
            dispositivo nuevo, se cierra la sesión anterior.
          </li>
          <li>Eres responsable de mantener tu contraseña en secreto y de la actividad de tu cuenta.</li>
        </ul>
      </LegalSection>

      <LegalSection n={3} title="Precios y pagos">
        <ul>
          <li>Los precios están en dólares estadounidenses (USD) e incluyen todos los cargos de nuestra parte.</li>
          <li>
            Los pagos se procesan con <strong>PayPal</strong> (cuenta PayPal o tarjeta de débito/crédito). No guardamos los datos de tu
            tarjeta.
          </li>
          <li>Tu banco o PayPal podrían aplicar un tipo de cambio o comisión si tu moneda no es el dólar.</li>
          <li>Los cupones y promociones tienen las condiciones indicadas en cada caso y no son acumulables entre sí.</li>
        </ul>
      </LegalSection>

      <LegalSection n={4} title="Acceso al curso">
        <ul>
          <li>El acceso se activa de inmediato cuando PayPal confirma el pago.</li>
          <li>
            El acceso es <strong>de por vida</strong> mientras la plataforma exista, e incluye las actualizaciones que hagamos al curso.
          </li>
          <li>Podemos mejorar, reordenar o reemplazar clases cuando CapCut cambie, manteniendo el contenido equivalente o mejor.</li>
          <li>Si algún día cerráramos la plataforma, avisaremos con al menos 60 días de anticipación.</li>
        </ul>
      </LegalSection>

      <LegalSection n={5} title="Reembolsos">
        <p>
          Al ser contenido digital con acceso inmediato, <strong>todas las ventas son finales y no se realizan reembolsos</strong>, salvo
          cobros duplicados o por error. Detalles en la{" "}
          <Link href="/reembolsos" className={link}>
            política de reembolsos
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection n={6} title="Uso permitido y propiedad intelectual">
        <ul>
          <li>Los videos, textos, materiales y la marca {LEGAL.businessName} nos pertenecen o tenemos licencia para usarlos.</li>
          <li>Puedes ver los cursos para tu aprendizaje personal y usar lo aprendido en tus propios proyectos, incluso comerciales.</li>
          <li>
            No está permitido descargar, grabar, copiar, revender, compartir tu cuenta ni publicar el contenido de los cursos. Si lo
            detectamos, podemos suspender la cuenta sin reembolso.
          </li>
        </ul>
      </LegalSection>

      <LegalSection n={7} title="Suspensión de cuentas">
        <p>
          Podemos suspender o cerrar cuentas que incumplan estos términos, usen medios de pago fraudulentos o abran disputas de mala fe.
        </p>
      </LegalSection>

      <LegalSection n={8} title="Responsabilidad">
        <p>
          Hacemos lo posible para que la plataforma funcione siempre, pero puede haber interrupciones por mantenimiento o por servicios de
          terceros (PayPal, Bunny.net, Google). Los resultados que obtengas dependen de tu práctica. CapCut es una marca de su respectivo
          titular; no estamos afiliados a ella.
        </p>
      </LegalSection>

      <LegalSection n={9} title="Cambios y contacto">
        <p>
          Podemos actualizar estos términos; la fecha de arriba indica la última versión. Los cambios no afectan a las compras ya
          realizadas. Dudas: <ContactLink /> o WhatsApp {SITE.whatsappNumber}.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
