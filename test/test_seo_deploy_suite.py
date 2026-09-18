import urllib.request
import urllib.error
import ssl
import sys

sys.stdout.reconfigure(encoding='utf-8')

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

BASE = "http://localhost:4000"

def test_endpoint(path, expected_status=200, required_headers=None, body_contains=None):
    url = f"{BASE}{path}"
    req = urllib.request.Request(url)
    try:
        with urllib.request.urlopen(req, timeout=5) as res:
            status = res.status
            headers = {k.lower(): v for k, v in res.headers.items()}
            body = res.read().decode('utf-8', errors='ignore')
    except urllib.error.HTTPError as e:
        status = e.code
        headers = {k.lower(): v for k, v in e.headers.items()}
        body = e.read().decode('utf-8', errors='ignore')
    except Exception as e:
        return False, f"Request failed: {e}"

    if status != expected_status:
        return False, f"Expected status {expected_status}, got {status}"

    if required_headers:
        for k, v in required_headers.items():
            actual = headers.get(k.lower())
            if not actual or v.lower() not in actual.lower():
                return False, f"Header {k} missing or mismatch (expected '{v}', got '{actual}')"

    if body_contains:
        for needle in body_contains:
            if needle.lower() not in body.lower():
                return False, f"Body does not contain expected snippet: '{needle}'"

    return True, "PASS"

tests = [
    ("/", 200, {
        "x-content-type-options": "nosniff",
        "x-frame-options": "SAMEORIGIN",
        "referrer-policy": "strict-origin-when-cross-origin"
    }, [
        'rel="canonical" href="https://universal-ai-seo-operating-system.onrender.com/"',
        'property="og:image"',
        'SoftwareApplication',
        'WebSite'
    ]),
    ("/robots.txt", 200, {"content-type": "text/plain"}, [
        "User-agent: GPTBot",
        "User-agent: PerplexityBot",
        "Sitemap:"
    ]),
    ("/sitemap.xml", 200, {"content-type": "application/xml"}, [
        "<loc>https://universal-ai-seo-operating-system.onrender.com/</loc>",
        "/blog/geo-vs-aeo-optimize-for-ai-search"
    ]),
    ("/llms.txt", 200, {"content-type": "text/plain"}, [
        "# OmniSEO OS",
        "Generative Engine Optimization (GEO / AEO)"
    ]),
    ("/blog", 200, {}, [
        "OmniSEO Knowledge Base",
        "GEO vs AEO: How to Optimize"
    ]),
    ("/blog/geo-vs-aeo-optimize-for-ai-search", 200, {}, [
        "GEO vs AEO: How to Optimize for Generative Search & AI Engines",
        "Retrieval-Augmented Generation"
    ]),
    ("/blog/keyword-cannibalization-find-and-fix", 200, {}, [
        "Keyword Cannibalization: How to Find and Fix Competing Internal URLs",
        "Nashik Kumbh Mela 2026"
    ]),
    ("/blog/core-web-vitals-lcp-cls-inp-explained", 200, {}, [
        "Core Web Vitals: LCP, CLS, and INP Explained for Engineers",
        "Interaction to Next Paint (INP)"
    ]),
    ("/non-existent-xyz-page", 404, {}, [
        "HTTP 404 // RESOURCE NOT FOUND",
        "Autonomous Signal Lost"
    ])
]

passed = 0
for path, status, headers, snippets in tests:
    ok, msg = test_endpoint(path, status, headers, snippets)
    status_emoji = "✅" if ok else "❌"
    print(f"{status_emoji} {path} -> {msg}")
    if ok:
        passed += 1

print(f"\nResults: {passed}/{len(tests)} tests passed.")
if passed == len(tests):
    print("ALL DEPLOYMENT & SEO VERIFICATION TESTS PASSED SUCCESSFULLY!")
else:
    exit(1)
