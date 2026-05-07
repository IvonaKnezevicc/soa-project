using PaymentService.Services;

namespace PaymentService.Clients;

public interface IStakeholdersClient
{
    Task<AuthenticatedIdentity?> ResolveIdentityAsync(HttpContext context, CancellationToken cancellationToken);
}
