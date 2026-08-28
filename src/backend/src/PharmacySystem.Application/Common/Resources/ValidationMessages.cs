namespace PharmacySystem.Application.Common.Resources;

/// <summary>
/// Marker class for IStringLocalizer&lt;ValidationMessages&gt; resolution.
/// Backed by ValidationMessages.resx (en, default) and ValidationMessages.es.resx (es).
/// Usage: inject IStringLocalizer&lt;ValidationMessages&gt; and read keys like localizer["Auth.EmailRequired"].
/// </summary>
public class ValidationMessages { }
