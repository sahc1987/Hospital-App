package com.hms.mapper;

import com.hms.dto.patient.PatientRequest;
import com.hms.entity.Patient;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface PatientMapper {
    Patient toEntity(PatientRequest request);
    void updateEntity(PatientRequest request, @MappingTarget Patient patient);
}
