import requests
import re
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = "http://localhost:4000"

def test_security_headers():
    print("[TEST 1] Verifying Security Headers & Deprecation Removal...")
    r = requests.get(BASE_URL)
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"
    
    headers = r.headers
    # Deprecated XSS protection must be removed
    assert "X-XSS-Protection" not in headers, "X-XSS-Protection must NOT be set (deprecated, causes vulnerability)"
    print("  ✅ Deprecated X-XSS-Protection correctly absent.")
    
    # HSTS
    hsts = headers.get("Strict-Transport-Security")
    assert hsts and "max-age=" in hsts, f"Strict-Transport-Security missing or invalid: {hsts}"
    print(f"  ✅ HSTS Header Verified: '{hsts}'")
    
    # CSP
    csp = headers.get("Content-Security-Policy")
    assert csp and "default-src" in csp, f"Content-Security-Policy missing or invalid: {csp}"
    print(f"  ✅ CSP Header Verified: '{csp[:60]}...'")
    
    # Other security headers
    assert headers.get("X-Content-Type-Options") == "nosniff"
    assert headers.get("X-Frame-Options") == "SAMEORIGIN"
    print("  ✅ nosniff and SAMEORIGIN verified.")

def test_security_txt():
    print("[TEST 2] Verifying security.txt discovery endpoints...")
    for path in ["/.well-known/security.txt", "/security.txt"]:
        r = requests.get(f"{BASE_URL}{path}")
        assert r.status_code == 200, f"Expected 200 for {path}, got {r.status_code}"
        assert "Contact: mailto:security@" in r.text
        assert "Expires:" in r.text
        print(f"  ✅ Endpoint {path} successfully serves valid RFC security.txt")

def test_provenance_modal_and_no_leak():
    print("[TEST 3] Verifying HTML Data Provenance Modal & Zero Hardcoded Leaks...")
    r = requests.get(BASE_URL)
    html = r.text
    
    # Check Data Provenance modal exists
    assert 'id="provenanceInfoModal"' in html, "provenanceInfoModal ID must exist in HTML"
    assert 'Data Provenance &amp; Verification Protocol' in html or 'Data Provenance & Verification Protocol' in html
    assert 'openProvenanceModal()' in html
    print("  ✅ Data Provenance Modal and open handler exist in HTML.")
    
    # Check zero pilgrimage/yatradham leaks
    leaks = re.findall(r'(yatradham|kumbh[\s_-]?mela)', html, re.IGNORECASE)
    assert len(leaks) == 0, f"Found hardcoded leaks in HTML: {leaks}"
    print("  ✅ ZERO hardcoded demo leaks in initial HTML.")

def test_rate_limiter():
    print("[TEST 4] Verifying Sliding-Window Rate Limiter...")
    # Send rapid requests to /api/robots-sitemap
    # Rate limit for general API is 120, crawl is 30.
    # Let's test crawl endpoint /api/scrape with invalid body to quickly test limit without load
    got_429 = False
    for i in range(35):
        resp = requests.post(f"{BASE_URL}/api/scrape", json={"url": ""})
        if resp.status_code == 429:
            got_429 = True
            data = resp.json()
            assert "Retry-After" in resp.headers or "retryAfter" in data
            print(f"  ✅ Rate limit triggered 429 Too Many Requests on request #{i+1} with Retry-After.")
            break
            
    assert got_429, "Rate limiter should trigger 429 for rapid requests exceeding limit"

if __name__ == "__main__":
    print("======================================================================")
    print("OMNISEO-OS PHASE 0 SECURITY & PROVENANCE BASELINE TEST SUITE")
    print("======================================================================")
    test_security_headers()
    test_security_txt()
    test_provenance_modal_and_no_leak()
    test_rate_limiter()
    print("\n🎉 ALL PHASE 0 SECURITY & PROVENANCE TESTS PASSED (100%)!")
