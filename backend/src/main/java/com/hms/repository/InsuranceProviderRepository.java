package com.hms.repository;

import com.hms.entity.InsuranceProvider;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface InsuranceProviderRepository extends JpaRepository<InsuranceProvider, Long> {
    List<InsuranceProvider> findAllByOrderByNameAsc();
}
