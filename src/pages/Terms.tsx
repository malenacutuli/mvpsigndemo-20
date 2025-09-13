import { Navigation } from '@/components/Navigation';

const Terms = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-6 py-16">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-black text-foreground mb-8">
            Legal Notice
          </h1>
          
          <div className="prose prose-lg max-w-none text-muted-foreground space-y-8">
            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">Purpose</h2>
              <p>
                AXESSIBLE TECHNOLOGIES, SL (hereinafter, the "OWNER OF THE WEBSITE").
              </p>
              <p>
                Browsing this website grants you the status of USER and implies your full and unreserved acceptance of each and every one of the conditions published in this legal notice. Please note that these conditions may be modified without prior notice by the OWNER OF THE WEBSITE, in which case they will be published and announced as early as possible.
              </p>
              <p>
                For this reason, it is advisable to read the contents carefully should you wish to access and make use of the information and services offered through this site.
              </p>
              <p>
                The USER also undertakes to make proper use of the website in accordance with the law, good faith, public order, customary practices, and this Legal Notice. The USER will be liable to the OWNER OF THE WEBSITE or to third parties for any damages that may result from a breach of this obligation.
              </p>
              <p>
                Any use other than that authorized is expressly prohibited, and the OWNER OF THE WEBSITE may deny or withdraw access and use at any time.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">Identification</h2>
              <p>
                In compliance with Law 34/2002, of July 11, on Information Society Services and Electronic Commerce, the OWNER OF THE WEBSITE provides the following details:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Corporate Name:</strong> AXESSIBLE TECHNOLOGIES, SL</li>
                <li><strong>Tax ID (NIF):</strong> B22675193</li>
                <li><strong>Registered Office:</strong> Calle Modolell 23, 08021 Barcelona, Spain</li>
                <li><strong>Registry:</strong> Registered in the corresponding Mercantile Registry.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">Communications</h2>
              <p>To communicate with us, you may use the following contact methods:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Postal Address:</strong> Calle Modolell 23, 08021 Barcelona, Spain</li>
                <li><strong>Email:</strong> hello@axessible.ai</li>
              </ul>
              <p>
                All notifications and communications between users and the OWNER OF THE WEBSITE will be considered effective, for all purposes, when made through any of the means listed above.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">Conditions of Access and Use</h2>
              <p>
                The website and its services are free and open to access. However, the OWNER OF THE WEBSITE may require the prior completion of a form for the use of certain services offered.
              </p>
              <p>
                The USER guarantees the authenticity and accuracy of all data provided to the OWNER OF THE WEBSITE and will be solely responsible for any false or inaccurate statements made.
              </p>
              <p>
                The USER expressly agrees to use the contents and services of the OWNER OF THE WEBSITE appropriately and not to use them for purposes including, but not limited to:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Disseminating criminal, violent, pornographic, racist, xenophobic, offensive, or terrorist content, or content contrary to law or public order.</li>
                <li>Introducing computer viruses or carrying out actions likely to alter, damage, interrupt, or cause errors in the systems of the OWNER OF THE WEBSITE.</li>
                <li>Attempting to access restricted areas of the website or other systems.</li>
                <li>Violating intellectual property, industrial property, or confidentiality rights.</li>
                <li>Impersonating other users.</li>
                <li>Reproducing, copying, or distributing content without legal authorization.</li>
                <li>Collecting data for advertising or commercial purposes without consent.</li>
              </ul>
              <p>
                All website content is the property of the OWNER OF THE WEBSITE, including text, images, graphics, source code, software, and design. No rights of exploitation are granted beyond what is necessary for proper website use.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">Intellectual Property</h2>
              <p>
                The contents of this website are protected by intellectual and industrial property laws. Ownership belongs to AXESSIBLE TECHNOLOGIES, SL. Reproduction, distribution, commercialization, or transformation of the content is prohibited unless expressly authorized or for strictly personal use.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">Data Protection</h2>
              <p>
                The processing of personal data collected through this website will comply with current personal data protection laws. For details, please consult the Privacy Policy published on this site.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">Disclaimer of Warranties and Liability</h2>
              <p>
                The contents of this website are general in nature and for informational purposes only. Continuous access and the accuracy, completeness, or currency of the content are not guaranteed. The OWNER OF THE WEBSITE is not liable for damages arising from access or use of the content, or for the presence of viruses or harmful elements.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">External Links</h2>
              <p>
                Links to third-party websites are provided solely to inform the USER of other sources of information. The OWNER OF THE WEBSITE assumes no responsibility for the content or functioning of linked sites.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">Unlawful Activities</h2>
              <p>
                If any USER considers that unlawful activities are being carried out on this site or on linked sites, they must notify the OWNER OF THE WEBSITE by email, properly identifying themselves and specifying the alleged infringements.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">Publications</h2>
              <p>
                The administrative information provided on this website does not replace the legal publication of laws, regulations, or official acts that must be published in official journals. The information published here should be understood as a guide with no legally binding effect.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-foreground mb-4">Applicable Law</h2>
              <p>
                This Legal Notice is governed by current Spanish legislation. The language of application is Spanish.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Terms;