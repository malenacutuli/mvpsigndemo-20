import { Navigation } from '@/components/Navigation';

const AccessibilityStatement = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-6 py-16">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-black text-foreground mb-8">
            Accessibility Statement
          </h1>
          
          <div className="prose prose-lg max-w-none text-muted-foreground space-y-8">
            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">Accessibility Policy</h2>
              <p>
                Axessible Technologies, SL, the manager of the website https://www.axessible.ai, is committed to making this site accessible in accordance with Royal Decree 1112/2018, of September 7, on the accessibility of public sector websites and mobile applications or developments financed by European public funds.
              </p>
              <p>
                This accessibility statement applies to the website https://www.axessible.ai, excluding embedded content from other domains.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">Compliance Status</h2>
              <p>
                This website is partially compliant with RD 1112/2018 due to the non-conformities listed below.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">Non-Accessible Content</h2>
              
              <h3 className="text-xl font-semibold text-foreground mb-3">Non-compliance with the regulations:</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  Some links may not have their purpose or function correctly defined - Requirement 9.2.4.4 "Purpose of Links" of UNE-EN 301549:2020.
                </li>
                <li>
                  Some elements may lack a correctly defined name, role, or value, or external elements may not provide an adequate functional definition - Requirement 9.4.1.2 "Name, Role, and Value" of UNE-EN 301549:2020.
                </li>
              </ul>

              <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">Disproportionate burden:</h3>
              <p>Not applicable.</p>

              <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">Content outside the scope of applicable legislation:</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  Office documents (PDF, Word, etc.) published before September 20, 2018 may not fully meet accessibility requirements.
                </li>
                <li>
                  Third-party content not developed by, or under the control of, Axessible Technologies, SL (e.g., documents from external collaborators).
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">Preparation of This Accessibility Statement</h2>
              <p>This statement was prepared on July 8, 2025.</p>
              <p>
                The method used was an internal self-assessment, with external support and automated tools provided by AccessiBe, our technology provider for ensuring digital accessibility. More information is available in their Privacy Policy.
              </p>
              <p>Last review of the statement: July 8, 2025.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">Feedback and Contact Information</h2>
              <p>You may submit communications regarding accessibility requirements (Article 10.2.a of RD 1112/2018), such as:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Reporting possible non-compliance with website accessibility.</li>
                <li>Conveying difficulties accessing content.</li>
                <li>Making queries or suggestions for improvement.</li>
              </ul>
              <p className="mt-4">
                You can contact us via the form available at https://www.axessible.ai/contacto or by email at hello@axessible.ai.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">Requests and Complaints</h2>
              <p>You may submit:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>A complaint regarding compliance with the requirements of RD 1112/2018.</li>
                <li>A request for accessible information concerning:
                  <ul className="list-disc pl-6 mt-2 space-y-1">
                    <li>Content excluded from the scope of RD 1112/2018 (Article 3.4).</li>
                    <li>Content exempted from compliance because it imposes a disproportionate burden.</li>
                  </ul>
                </li>
              </ul>
              <p className="mt-4">
                Requests must clearly detail the facts, reasons, and request in order to demonstrate that they are reasonable and legitimate.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccessibilityStatement;