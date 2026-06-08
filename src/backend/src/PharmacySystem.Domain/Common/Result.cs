namespace PharmacySystem.Domain.Common;

public class Result<T>
{
    private Result(bool isSuccess, T? value, DomainError? error)
    {
        IsSuccess = isSuccess;
        Value = value;
        Error = error;
    }

    public bool IsSuccess { get; }
    public bool IsFailure => !IsSuccess;
    public T? Value { get; }
    public DomainError? Error { get; }

    public static Result<T> Success(T value) => new(true, value, null);
    public static Result<T> Failure(DomainError error) => new(false, default, error);
}

public abstract record DomainError(string Code, string Message);

public record ValidationError(
    string Code,
    string Message,
    IDictionary<string, string[]> Errors) : DomainError(Code, Message);

public record NotFoundError(string Code, string Message) : DomainError(Code, Message);
public record ConflictError(string Code, string Message) : DomainError(Code, Message);
public record UnauthorizedError(string Code, string Message) : DomainError(Code, Message);

/// <summary>
/// Returned when a login or register request arrives without X-Tenant-Id and the email
/// belongs to two or more active tenants. The client must present a picker and retry
/// with X-Tenant-Id set to the selected tenant's id.
/// </summary>
public record TenantSelectionRequiredError(
    string Code,
    string Message,
    IReadOnlyList<TenantInfo> Tenants) : DomainError(Code, Message);

/// <summary>
/// Minimal tenant descriptor used by TenantSelectionRequiredError.
/// Kept in the Domain layer to avoid a Domain → Application DTO dependency.
/// </summary>
public record TenantInfo(Guid Id, string Name, string Slug);
