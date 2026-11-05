import type { Metadata } from "next";
import { ContactLink, LegalPage, LegalSection } from "@/components/legal/legal-page";
import { LEGAL } from "@/lib/site";

export const metadata: Metadata = { title: "Política de privacidad" };

// Proveedores que tratan datos por encargo nuestro. Si se agrega o quita uno, actualizar aquí.
const PROVIDERS = [
  { name: "Supabase", purpose: "base de datos, cuentas e inicio de sesión" },
  { name: "PayPal", purpose: "cobro de los cursos (cuenta PayPal o tarjeta)" },
  { name: "Bunny.net", purpose: "almacenamiento y reproducción de los videos" },
  { name: "Resend", purpose: "envío de correos (confirmaciones y avisos de tu cuenta)" },
  { name: "Vercel", purpose: "alojamiento de la web" },
  { name: "Google", purpose: "inicio de sesión, solo si eliges «Continuar con Google»" },
  { name: "WhatsApp", purpose: "soporte, solo si nos escribes" },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Política de privacidad"
      intro={
        <p>
          En {LEGAL.businessName} cuidamos tus datos personales. Aquí te explicamos qué datos recopilamos, para qué los usamos, con quién
          los compartimos y cómo puedes ejercer tus derechos.
        </p>
      }
    >
      <LegalSection n={1} title="Responsable">
        <p>
          El responsable del tratamiento de tus datos es {LEGAL.businessName}, con sede en {LEGAL.country}. Para cualquier consulta sobre
          privacidad escríbenos a <ContactLink />.
        </p>
      </LegalSection>

      <LegalSection n={2} title="Qué datos recopilamos">
        <ul>
          <li>
            <strong>Datos de tu cuenta:</strong> correo electrónico, nombre y contraseña (guardada cifrada; no podemos verla). Si entras con
            Google, recibimos tu nombre, correo y foto de perfil.
          </li>
          <li>
            <strong>Compras:</strong> curso comprado, monto, cupón usado, fecha y número de operación de PayPal, y el correo de tu cuenta
            PayPal. <strong>No recibimos ni guardamos los datos de tu tarjeta</strong>: eso lo gestiona PayPal.
          </li>
          <li>
            <strong>Avance:</strong> las clases que completas en cada curso.
          </li>
          <li>
            <strong>Datos técnicos:</strong> dirección IP y tipo de dispositivo/navegador de tu sesión activa, para la seguridad de la cuenta
            (una sesión a la vez) y para evitar abusos.
          </li>
          <li>
            <strong>Si compraste en nuestra web anterior:</strong> migramos tu correo, nombre, cursos comprados y avance para que no pierdas
            tu acceso.
          </li>
        </ul>
      </LegalSection>

      <LegalSection n={3} title="Para qué los usamos">
        <ul>
          <li>Crear y gestionar tu cuenta y darte acceso a los cursos que compraste.</li>
          <li>Procesar tus pagos, reembolsos y emitir confirmaciones de compra.</li>
          <li>Guardar tu avance para que continúes donde te quedaste.</li>
          <li>Enviarte correos necesarios del servicio: confirmación de cuenta, recuperación de contraseña, compras y accesos.</li>
          <li>Proteger la plataforma contra fraudes, cuentas compartidas y accesos no autorizados.</li>
        </ul>
        <p>No vendemos tus datos ni los usamos para publicidad de terceros.</p>
      </LegalSection>

      <LegalSection n={4} title="Con quién los compartimos">
        <p>Solo con los proveedores que necesitamos para dar el servicio, cada uno para lo indicado:</p>
        <ul>
          {PROVIDERS.map((p) => (
            <li key={p.name}>
              <strong>{p.name}:</strong> {p.purpose}.
            </li>
          ))}
        </ul>
        <p>También podríamos compartirlos si una autoridad competente lo exige legalmente.</p>
      </LegalSection>

      <LegalSection n={5} title="Cuánto tiempo los guardamos">
        <p>
          Mientras tengas tu cuenta. Los registros de compras los conservamos el tiempo que exijan las normas contables y tributarias,
          aunque elimines tu cuenta.
        </p>
      </LegalSection>

      <LegalSection n={6} title="Tus derechos">
        <p>
          Puedes pedir acceso, corrección o eliminación de tus datos, o la eliminación de tu cuenta, escribiendo a <ContactLink />. Al
          eliminar la cuenta pierdes el acceso a los cursos comprados.
        </p>
      </LegalSection>

      <LegalSection n={7} title="Cookies">
        <p>
          Usamos solo las cookies necesarias para mantener tu sesión iniciada. No usamos cookies de publicidad. PayPal puede usar sus propias
          cookies durante el pago.
        </p>
      </LegalSection>

      <LegalSection n={8} title="Cambios">
        <p>Si cambiamos esta política, actualizaremos la fecha de arriba y, si el cambio es importante, te avisaremos por correo.</p>
      </LegalSection>
    </LegalPage>
  );
}
