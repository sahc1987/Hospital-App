package com.hms.repository;

import com.hms.entity.PharmacyItem;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;

public interface PharmacyItemRepository extends JpaRepository<PharmacyItem, Long> {
    Page<PharmacyItem> findByNameContainingIgnoreCase(String name, Pageable pageable);
    List<PharmacyItem> findByCategory(String category);

    @Query("SELECT p FROM PharmacyItem p WHERE p.stockQuantity <= p.reorderLevel")
    List<PharmacyItem> findLowStock();

    @Query("SELECT COUNT(p) FROM PharmacyItem p WHERE p.stockQuantity <= p.reorderLevel")
    long countLowStock();
}
