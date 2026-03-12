function BrandMark({ compact = false, center = false, showTagline = true }) {
  return (
    <div className={`brand-wrap ${center ? "brand-wrap--center" : ""}`}>
      <div className="brand-icon-shell" aria-hidden="true">
        <img src="/image1.png" alt="" className="brand-icon" />
      </div>

      <div>
        <h1 className={`brand-title ${compact ? "brand-title--compact" : ""}`}>
          Resume<span>IQ</span>
        </h1>
        {showTagline && (
          <p className={`brand-tagline ${compact ? "brand-tagline--compact" : ""}`}>
            Smarter resumes. Better jobs.
          </p>
        )}
      </div>
    </div>
  );
}

export default BrandMark;
