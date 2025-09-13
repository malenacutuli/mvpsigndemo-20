import { Navigation } from '@/components/Navigation';

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-6 py-16">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-black text-foreground mb-8">
            Privacy Policy
          </h1>
          
          <div className="prose prose-lg max-w-none text-muted-foreground space-y-8">
            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">Who Is Responsible for Processing Your Data?</h2>
              <p>
                AXESSIBLE TECHNOLOGIES, SL (hereinafter, the "CONTROLLER") is responsible for the processing of the User's personal data and informs you that such data will be processed in accordance with the provisions of current regulations on personal data protection: Regulation (EU) 2016/679 (GDPR) and Organic Law 3/2018 (LOPDGDD).
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Identity:</strong> AXESSIBLE TECHNOLOGIES, SL</li>
                <li><strong>Tax ID (NIF):</strong> B22675193</li>
                <li><strong>Postal Address:</strong> Calle Modolell 23, 08021 Barcelona, Spain</li>
                <li><strong>Contact Email:</strong> hello@axessible.ai</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">For What Purpose Do We Process Your Personal Data?</h2>
              <p>
                At AXESSIBLE TECHNOLOGIES, SL we process your data in order to maintain a business relationship with you, send you communications of interest, and properly manage requests or inquiries you submit.
              </p>
              <p>The main purposes are:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Sending commercial communications by electronic or physical means related to our products and services, or from partners with whom we maintain collaboration agreements.</li>
                <li>Conducting statistical studies.</li>
                <li>Processing orders, requests, or any type of petition made by the user.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">What Is the Legal Basis for Processing Your Data?</h2>
              <p>The legal basis for processing is:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>The consent of the data subject.</li>
                <li>The performance of contractual relationships.</li>
                <li>The legitimate interest of the CONTROLLER in keeping the user informed about related products and services.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">How Long Do We Keep Your Data?</h2>
              <p>
                The personal data provided will be retained as long as there is a mutual interest in maintaining the purpose of the processing, or until the data subject requests its deletion, and for the period necessary to comply with legal obligations.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">What Are Your Rights When You Provide Us with Your Data?</h2>
              <p>You have the right to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Access your personal data.</li>
                <li>Request the rectification of inaccurate data.</li>
                <li>Request its deletion when it is no longer necessary for the purposes for which it was collected.</li>
                <li>Object to the processing of your data.</li>
                <li>Request the restriction of processing.</li>
                <li>Request the portability of your data.</li>
              </ul>
              <p className="mt-4">
                To exercise these rights, you may contact us in writing at our postal address or by email at info@axessible.ai, attaching a copy of your identification document.
              </p>
              <p>
                If you believe that your rights have not been respected, you may file a complaint with the Spanish Data Protection Agency (www.aepd.es).
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">Where Do We Obtain Your Data From?</h2>
              <p>The data we process comes directly from the data subject through:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Contact forms on our website.</li>
                <li>Electronic communications.</li>
              </ul>
              
              <p className="mt-4"><strong>Categories of data processed:</strong></p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Identification data</li>
                <li>Postal and email addresses</li>
                <li>Commercial information</li>
              </ul>
              
              <p className="mt-4">No special categories of personal data are processed.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">To Whom Will Your Data Be Communicated?</h2>
              <p>Your data may be communicated to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Public administrations and authorities where required by current legislation.</li>
                <li>AccessiBe, our partner company ensuring web accessibility, under the terms described in its Privacy Policy. Data sharing will be limited to purposes related to digital accessibility and in compliance with the European legal framework.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">Will International Data Transfers Be Made?</h2>
              <p>
                In the event that data is processed outside the European Economic Area by our technology partners (such as AccessiBe), we guarantee that such transfers will be carried out in compliance with all adequate safeguards in accordance with Articles 44 and following of the GDPR, through standard contractual clauses or other mechanisms recognized by the European Commission.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">Updates</h2>
              <p>
                This Policy may be updated to adapt to legislative or technical changes. We recommend reviewing it periodically.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;