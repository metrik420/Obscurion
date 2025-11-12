export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold mb-8 text-gray-900">Terms of Service</h1>

        <div className="prose prose-lg max-w-none text-gray-700 space-y-6">
          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4 text-gray-900">1. Agreement to Terms</h2>
            <p>
              By accessing and using Obscurion, you accept and agree to be bound by the terms and provision of this agreement.
              If you do not agree to abide by the above, please do not use this service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4 text-gray-900">2. Intellectual Property Rights</h2>
            <p>
              Obscurion reserves all rights to user content. You grant Obscurion a worldwide, non-exclusive, royalty-free license
              to use, copy, modify, distribute, and display any content you submit or create on our platform.
            </p>
            <p className="font-semibold text-red-600">
              Obscurion retains all rights to user content and may modify, delete, or remove any content stored on our server at any time,
              with or without warning, at our sole discretion.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4 text-gray-900">3. User Responsibilities</h2>
            <p>You agree to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Provide accurate and complete information during registration</li>
              <li>Maintain the confidentiality of your account credentials</li>
              <li>Notify us immediately of any unauthorized use of your account</li>
              <li>Not use the service for any illegal or unauthorized purpose</li>
              <li>Not upload content that violates intellectual property rights</li>
              <li>Not attempt to gain unauthorized access to our systems</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4 text-gray-900">4. Content and Conduct</h2>
            <p>You agree not to upload, post, or transmit any content that:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Is defamatory, obscene, or offensive</li>
              <li>Infringes on any third-party intellectual property rights</li>
              <li>Contains malicious code or viruses</li>
              <li>Violates any law or regulation</li>
              <li>Harasses, threatens, or abuses others</li>
            </ul>
            <p className="mt-4">
              We reserve the right to remove any content that violates these terms without notice.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4 text-gray-900">5. Account Suspension and Termination</h2>
            <p>
              Obscurion reserves the right to suspend or terminate your account at any time for any reason, including
              but not limited to violation of these terms. Upon termination, your data may be permanently deleted.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4 text-gray-900">6. Data Access and Security</h2>
            <p>
              Obscurion may access, retain, and disclose your account information and user content if required by law,
              legal process, or for security and safety purposes. We are not liable for any unauthorized access to your account
              unless caused by our negligence.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4 text-gray-900">7. Limitation of Liability</h2>
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, OBSCURION AND ITS OWNERS SHALL NOT BE LIABLE FOR ANY INDIRECT,
              INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF DATA, REVENUE, OR PROFITS,
              EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4 text-gray-900">8. Disclaimer of Warranties</h2>
            <p>
              OBSCURION IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
              INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4 text-gray-900">9. Changes to Terms</h2>
            <p>
              Obscurion reserves the right to modify these terms at any time. Your continued use of the service
              constitutes acceptance of the updated terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4 text-gray-900">10. Governing Law</h2>
            <p>
              These terms shall be governed by and construed in accordance with the laws of the jurisdiction in which
              Obscurion operates, without regard to its conflict of law provisions.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4 text-gray-900">11. Contact Us</h2>
            <p>
              If you have any questions about these terms, please contact us through the support channels available
              in your account or at the email address associated with your account.
            </p>
          </section>

          <section className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mt-8">
            <p className="text-sm text-yellow-800">
              <strong>Last Updated:</strong> November 12, 2025
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
