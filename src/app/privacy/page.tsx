export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold mb-8 text-gray-900">Privacy Policy</h1>

        <div className="prose prose-lg max-w-none text-gray-700 space-y-6">
          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4 text-gray-900">1. Introduction</h2>
            <p>
              Obscurion ("we," "us," or "our") operates the Obscurion application. This page informs you of our policies
              regarding the collection, use, and disclosure of personal data when you use our service and the choices you have
              associated with that data.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4 text-gray-900">2. Information Collection and Use</h2>
            <p>We collect several different types of information for various purposes:</p>

            <h3 className="text-xl font-semibold mt-4 mb-2 text-gray-800">Personal Data</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Email address</li>
              <li>Display name (optional)</li>
              <li>Account password (hashed)</li>
              <li>IP address and user agent for login tracking</li>
            </ul>

            <h3 className="text-xl font-semibold mt-4 mb-2 text-gray-800">Usage Data</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Notes you create and edit</li>
              <li>Flashcards you generate</li>
              <li>Search queries</li>
              <li>Login timestamps and locations</li>
              <li>Device fingerprint information</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4 text-gray-900">3. Use of Data</h2>
            <p>Obscurion uses the collected data for various purposes:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>To provide and maintain our service</li>
              <li>To notify you about changes to our service</li>
              <li>To allow you to participate in interactive features</li>
              <li>To gather analysis or valuable information to improve our service</li>
              <li>To monitor the usage of our service</li>
              <li>To detect, prevent, and address technical issues and fraud</li>
              <li>To provide customer care and support</li>
              <li>To enforce our Terms of Service and other agreements</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4 text-gray-900">4. Data Access for Security and Legal Purposes</h2>
            <p>
              Obscurion may access, retain, and disclose your personal data and user content if required by law,
              legal process, or for security, legal compliance, or safety reasons. This includes access by our team
              for account security investigations and fraud prevention.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4 text-gray-900">5. Data Retention</h2>
            <p>
              We retain your personal data and content for as long as your account is active or as needed to provide our service.
              You can request deletion of your account at any time through your account settings.
            </p>
            <p className="font-semibold mt-4">
              Upon deletion request, your data enters a 30-day grace period. After 30 days, your data is permanently and
              irreversibly deleted from our systems.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4 text-gray-900">6. Security of Data</h2>
            <p>
              The security of your data is important to us but remember that no method of transmission over the internet
              is 100% secure. While we strive to use commercially acceptable means to protect your personal data,
              we cannot guarantee its absolute security.
            </p>
            <p className="mt-4">
              Your password is hashed using bcryptjs with a 10-round salt before storage.
              We do not store plain-text passwords.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4 text-gray-900">7. Changes to This Privacy Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting
              the new Privacy Policy on this page and updating the "Last Updated" date.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4 text-gray-900">8. Children's Privacy</h2>
            <p>
              Our service is not intended for individuals under the age of 18. We do not knowingly collect personal information
              from children under 18. If we become aware that a child under 18 has provided us with personal information,
              we will take steps to delete such information immediately.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4 text-gray-900">9. Your Rights</h2>
            <p>Depending on your location, you may have the following rights:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>The right to access your personal data</li>
              <li>The right to correct inaccurate data</li>
              <li>The right to request deletion of your data</li>
              <li>The right to restrict processing of your data</li>
              <li>The right to data portability</li>
              <li>The right to opt-out of certain data uses</li>
            </ul>
            <p className="mt-4">
              To exercise any of these rights, please contact us through your account settings or at the email associated with your account.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4 text-gray-900">10. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy or our privacy practices, please contact us at the email
              address associated with your account or through the support channels available in your account.
            </p>
          </section>

          <section className="bg-blue-50 border-l-4 border-blue-400 p-4 mt-8">
            <p className="text-sm text-blue-800">
              <strong>Last Updated:</strong> November 12, 2025
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
